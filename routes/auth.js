// Routes for accounts: sign up, log in, log out, "who am I?"
// All addresses here start with /api/auth (see server.js).
const express = require('express');
const { query, queryOne } = require('../db');
const { hashPassword, checkPassword, startSession, endSession, getCurrentUser } = require('../auth');
const { DEFAULT_PRICES } = require('../prices');

const router = express.Router();

// something@something.something, with no spaces
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Reads a text field safely: always a string, without spaces at the ends
function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

// "Sparkle Home Cleaning!" -> "sparkle-home-cleaning" (used in the page address)
function makeSlug(name) {
  const slug = name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return slug.slice(0, 50) || 'company';
}

// Adds -2, -3... if another company already has this slug
async function uniqueSlug(name) {
  const base = makeSlug(name);
  let slug = base;
  let number = 2;
  while (await queryOne('SELECT id FROM companies WHERE slug = $1', [slug])) {
    slug = `${base}-${number}`;
    number = number + 1;
  }
  return slug;
}

// POST /api/auth/signup
// Customers send: role, name, email, password
// Companies also send: companyName, city
router.post('/signup', async (req, res) => {
  const body = req.body || {};
  const role = body.role;
  const name = text(body.name);
  const email = text(body.email).toLowerCase();
  const password = typeof body.password === 'string' ? body.password : '';

  if (role !== 'customer' && role !== 'company') {
    return res.status(400).json({ error: 'Please choose a customer or a company account.' });
  }
  if (name.length < 2 || name.length > 100) {
    return res.status(400).json({ error: 'Please enter your name (2 to 100 characters).' });
  }
  if (!EMAIL_PATTERN.test(email) || email.length > 200) {
    return res.status(400).json({ error: 'Please enter a valid email address, like name@example.com.' });
  }
  if (password.length < 8 || password.length > 200) {
    return res.status(400).json({ error: 'Your password needs at least 8 characters.' });
  }

  const companyName = text(body.companyName);
  const city = text(body.city);
  if (role === 'company') {
    if (companyName.length < 2 || companyName.length > 60) {
      return res.status(400).json({ error: 'Please enter the company name (2 to 60 characters).' });
    }
    if (city.length < 2 || city.length > 60) {
      return res.status(400).json({ error: 'Please enter the city you work in (2 to 60 characters).' });
    }
  }

  if (await queryOne('SELECT id FROM users WHERE email = $1', [email])) {
    return res.status(400).json({ error: 'An account with this email already exists. Try logging in.' });
  }

  const now = new Date().toISOString();
  const user = await queryOne(
    `INSERT INTO users (role, name, email, password_hash, created_at)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [role, name, email, hashPassword(password), now]
  );

  if (role === 'company') {
    // The company starts as 'pending': it is NOT shown to customers until it pays
    await query(
      `INSERT INTO companies (user_id, name, slug, city, description, prices, subscription_status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [user.id, companyName, await uniqueSlug(companyName), city, '', JSON.stringify(DEFAULT_PRICES), 'pending', now]
    );
  }

  await startSession(res, req, user.id);
  // 201 = "Created"
  res.status(201).json({ user: { id: user.id, role: role, name: name, email: email } });
});

// POST /api/auth/login  { email, password }
router.post('/login', async (req, res) => {
  const body = req.body || {};
  const email = text(body.email).toLowerCase();
  const password = typeof body.password === 'string' ? body.password : '';

  const user = await queryOne('SELECT id, role, name, email, password_hash FROM users WHERE email = $1', [email]);
  // The same message for "no such email" and "wrong password", so strangers
  // can't find out which emails have an account
  if (!user || !checkPassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'Wrong email or password.' });
  }

  await startSession(res, req, user.id);
  res.json({ user: { id: user.id, role: user.role, name: user.name, email: user.email } });
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
  await endSession(req, res);
  res.json({ message: 'Logged out.' });
});

// GET /api/auth/me: who is logged in? Every page uses this for the menu.
router.get('/me', async (req, res) => {
  const user = await getCurrentUser(req);
  if (!user) {
    return res.json({ user: null });
  }
  let company = null;
  if (user.role === 'company') {
    const row = await queryOne('SELECT name, slug, subscription_status FROM companies WHERE user_id = $1', [user.id]);
    if (row) {
      company = { name: row.name, slug: row.slug, subscriptionStatus: row.subscription_status };
    }
  }
  res.json({ user: user, company: company });
});

module.exports = { router, EMAIL_PATTERN, makeSlug };
