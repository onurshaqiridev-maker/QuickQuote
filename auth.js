// QuickQuote accounts: passwords and login sessions
// Uses only Node's built-in "crypto" module, no extra packages.
const crypto = require('crypto');
const { query, queryOne } = require('./db');

const COOKIE_NAME = 'qq_session';
const SESSION_DAYS = 30;

// ---------- Passwords ----------
// We NEVER save the password itself. We save a "hash": a scrambled version
// that can't be turned back into the password. "scrypt" is slow on purpose,
// which makes guessing millions of passwords very hard.
// The "salt" is random, so two people with the same password get different hashes.
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function checkPassword(password, saved) {
  const [salt, hash] = saved.split(':');
  const attempt = crypto.scryptSync(password, salt, 64);
  // timingSafeEqual compares without leaking how many characters matched
  return crypto.timingSafeEqual(attempt, Buffer.from(hash, 'hex'));
}

// ---------- Sessions ----------
// After logging in, the browser gets a random "token" in a cookie. It sends the
// cookie back with every request, and that's how the server knows who you are.
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function startSession(res, req, userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await query('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)',
    [hashToken(token), userId, expires.toISOString()]);

  // HttpOnly: JavaScript in the page can't read the cookie (protects against XSS)
  // SameSite=Lax: other websites can't send forms to us with your cookie
  // Secure: only sent over https (online). On localhost (http) it's left out.
  const parts = [
    `${COOKIE_NAME}=${token}`, 'Path=/', 'HttpOnly', 'SameSite=Lax',
    `Max-Age=${SESSION_DAYS * 24 * 60 * 60}`
  ];
  if (req.secure) {
    parts.push('Secure');
  }
  res.append('Set-Cookie', parts.join('; '));
}

// Reads one cookie from the "Cookie" header, e.g. "qq_session=abc123; theme=dark"
function readCookie(req, name) {
  const header = req.get('cookie') || '';
  for (const piece of header.split(';')) {
    const [key, ...rest] = piece.trim().split('=');
    if (key === name) {
      return rest.join('=');
    }
  }
  return null;
}

async function endSession(req, res) {
  const token = readCookie(req, COOKIE_NAME);
  if (token) {
    await query('DELETE FROM sessions WHERE token_hash = $1', [hashToken(token)]);
  }
  res.append('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

// Returns the logged-in user ({ id, role, name, email }) or null
async function getCurrentUser(req) {
  const token = readCookie(req, COOKIE_NAME);
  if (!token) {
    return null;
  }
  const row = await queryOne(
    `SELECT users.id, users.role, users.name, users.email, sessions.expires_at
     FROM sessions JOIN users ON users.id = sessions.user_id
     WHERE sessions.token_hash = $1`,
    [hashToken(token)]
  );
  if (!row || row.expires_at < new Date().toISOString()) {
    return null; // no such session, or it has expired
  }
  return { id: row.id, role: row.role, name: row.name, email: row.email };
}

// "Middleware": runs before a route. It stops the request with 401 if nobody
// is logged in, or 403 if the account is the wrong kind (e.g. a customer
// trying to use a company-only route). Otherwise it puts the user in req.user.
// Use it like: router.get('/something', requireUser('company'), (req, res) => {...})
function requireUser(role) {
  return async (req, res, next) => {
    const user = await getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Please log in first.' });
    }
    if (role && user.role !== role) {
      return res.status(403).json({ error: `This is only for ${role} accounts.` });
    }
    req.user = user;
    next();
  };
}

module.exports = { hashPassword, checkPassword, startSession, endSession, getCurrentUser, requireUser };
