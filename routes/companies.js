// Public routes: the list of companies, search, one company's prices,
// a price calculation and sending a quote request.
// All addresses here start with /api/companies (see server.js).
const express = require('express');
const { query, queryOne } = require('../db');
const { getCurrentUser, requireUser } = require('../auth');
const { startingPrice, validateChoices, calculateQuote } = require('../prices');
const { LIVE_STATUSES } = require('../billing');

const router = express.Router();

// SQL text for "the company has paid": subscription_status IN ('active', 'trialing')
const IS_LIVE = `subscription_status IN (${LIVE_STATUSES.map((s) => `'${s}'`).join(', ')})`;

// Turns a database row into what the browser needs (prices: JSON text -> object)
function publicCompany(row) {
  const prices = JSON.parse(row.prices);
  return {
    name: row.name,
    slug: row.slug,
    city: row.city,
    description: row.description,
    startingPrice: startingPrice(prices),
    prices: prices
  };
}

// Finds a company that customers are allowed to see. The owner may also
// see their own company before paying, to preview the page.
async function findVisibleCompany(req) {
  const row = await queryOne('SELECT * FROM companies WHERE slug = $1', [String(req.params.slug)]);
  if (!row) {
    return null;
  }
  if (LIVE_STATUSES.includes(row.subscription_status)) {
    return row;
  }
  const user = await getCurrentUser(req);
  return user && user.id === row.user_id ? row : null;
}

// GET /api/companies?search=sparkle
// Only companies that have paid. The search looks in name, city and description.
router.get('/', async (req, res) => {
  const search = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase().slice(0, 60) : '';
  // % and _ are special in LIKE ("any text", "any letter"), so we escape them with \
  const pattern = '%' + search.replace(/[\\%_]/g, (c) => '\\' + c) + '%';

  const rows = await query(
    `SELECT * FROM companies
     WHERE ${IS_LIVE}
       AND (LOWER(name) LIKE $1 ESCAPE '\\' OR LOWER(city) LIKE $1 ESCAPE '\\' OR LOWER(description) LIKE $1 ESCAPE '\\')
     ORDER BY name
     LIMIT 50`,
    [pattern]
  );

  // The list doesn't need every price, only the "From €..." price
  res.json(rows.map((row) => {
    const company = publicCompany(row);
    delete company.prices;
    return company;
  }));
});

// GET /api/companies/sparkle-home-cleaning: one company with its full price list
router.get('/:slug', async (req, res) => {
  const row = await findVisibleCompany(req);
  if (!row) {
    return res.status(404).json({ error: 'We could not find this company.' });
  }
  res.json(publicCompany(row));
});

// POST /api/companies/:slug/quote: calculate a price with THIS company's prices
router.post('/:slug/quote', async (req, res) => {
  const row = await findVisibleCompany(req);
  if (!row) {
    return res.status(404).json({ error: 'We could not find this company.' });
  }
  const prices = JSON.parse(row.prices);
  const error = validateChoices(req.body, prices);
  if (error) {
    return res.status(400).json({ error: error });
  }
  res.json(calculateQuote(req.body, prices));
});

// POST /api/companies/:slug/requests: a logged-in customer asks for the job.
// Name and email come from the customer's account, not from the form.
router.post('/:slug/requests', requireUser('customer'), async (req, res) => {
  const row = await queryOne(`SELECT * FROM companies WHERE slug = $1 AND ${IS_LIVE}`, [String(req.params.slug)]);
  if (!row) {
    return res.status(404).json({ error: 'This company is not taking requests right now.' });
  }
  const prices = JSON.parse(row.prices);
  const choices = (req.body || {}).choices;
  const error = validateChoices(choices, prices);
  if (error) {
    return res.status(400).json({ error: error });
  }

  // Never trust a price from the browser: calculate it again here
  const quote = calculateQuote(choices, prices);
  const saved = await queryOne(
    `INSERT INTO requests (company_id, customer_id, service, rooms, frequency, extras, total_cents, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [row.id, req.user.id, quote.service, quote.rooms, quote.frequency,
      JSON.stringify(quote.extras), Math.round(quote.total * 100), new Date().toISOString()]
  );
  res.status(201).json({ id: saved.id, company: row.name, total: quote.total });
});

module.exports = { router };
