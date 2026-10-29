// QuickQuote database
// One small function, query(sql, params), that every other file uses.
//
// Two kinds of database, the same SQL:
// - On your computer: SQLite, built into Node.js (22.5 or newer). It's one file,
//   data/quickquote.db, and there's nothing to install or sign up for.
// - Online (Vercel): PostgreSQL, a real database server. Set DATABASE_URL to the
//   connection string you get from your database provider (for example Neon).
//
// The SQL in this project is written so it works on both: we write "$1, $2..."
// for values, keep JSON as text, keep dates as text and keep money in cents.
const fs = require('fs');
const os = require('os');
const path = require('path');

// The tables. "IF NOT EXISTS" means: create it only the first time.
// The only difference between the two databases is how a new id is made.
function schema(idColumn) {
  return [
    `CREATE TABLE IF NOT EXISTS users (
      id ${idColumn},
      role TEXT NOT NULL,              -- 'company' or 'customer'
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,     -- we store a hash, never the real token
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS companies (
      id ${idColumn},
      user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,       -- used in the address: company.html?c=sparkle-home-cleaning
      city TEXT NOT NULL,
      description TEXT NOT NULL,
      prices TEXT NOT NULL,            -- the company's price list, saved as JSON text
      subscription_status TEXT NOT NULL, -- 'pending' (not paid yet), 'active', 'past_due', 'canceled'...
      stripe_customer_id TEXT,
      stripe_subscription_id TEXT,
      created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS requests (
      id ${idColumn},
      company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      customer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      service TEXT NOT NULL,
      rooms INTEGER NOT NULL,
      frequency TEXT NOT NULL,
      extras TEXT NOT NULL,            -- JSON text, e.g. ["Inside oven"]
      total_cents INTEGER NOT NULL,    -- €144.50 is saved as 14450 (no rounding problems)
      created_at TEXT NOT NULL
    )`
  ];
}

let runQuery; // set up the first time query() is called
let ready;    // a promise that finishes when the tables exist

async function setUp() {
  if (process.env.DATABASE_URL) {
    // ---- PostgreSQL (online) ----
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 3 });
    runQuery = async (sql, params) => (await pool.query(sql, params)).rows;
    for (const sql of schema('SERIAL PRIMARY KEY')) {
      await pool.query(sql);
    }
    return;
  }

  // ---- SQLite (on your computer) ----
  const { DatabaseSync } = require('node:sqlite');
  // On Vercel the project folder is read-only, so without DATABASE_URL we can
  // only use the temporary folder (and the data disappears). Use DATABASE_URL there!
  const folder = process.env.VERCEL ? os.tmpdir() : path.join(__dirname, 'data');
  if (process.env.VERCEL) {
    console.warn('DATABASE_URL is not set: data is saved in a temporary folder and will disappear.');
  }
  fs.mkdirSync(folder, { recursive: true });
  const file = process.env.DB_FILE || path.join(folder, 'quickquote.db');
  const db = new DatabaseSync(file);
  db.exec('PRAGMA foreign_keys = ON');

  runQuery = async (sql, params) => {
    // SQLite writes numbered values as ?1, ?2 instead of $1, $2
    const statement = db.prepare(sql.replace(/\$(\d+)/g, '?$1'));
    return statement.all(...params);
  };
  for (const sql of schema('INTEGER PRIMARY KEY AUTOINCREMENT')) {
    db.exec(sql);
  }
}

// Runs one SQL command and returns the rows (a list of objects).
// Example: await query('SELECT * FROM users WHERE email = $1', ['ana@example.com'])
async function query(sql, params = []) {
  if (!ready) {
    // If setting up fails (e.g. a wrong DATABASE_URL), try again next time
    ready = setUp().catch((error) => {
      ready = null;
      throw error;
    });
  }
  await ready;
  return runQuery(sql, params);
}

// Same, but returns only the first row (or null if there is none)
async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

module.exports = { query, queryOne };
