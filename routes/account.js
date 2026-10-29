// Routes for logged-in users: the company dashboard, "my requests" and payments.
// Addresses here start with /api/my or /api/billing (see server.js).
const express = require('express');
const { query, queryOne } = require('../db');
const { requireUser } = require('../auth');
const { validatePriceList } = require('../prices');
const billing = require('../billing');

const router = express.Router();

// The company that belongs to the logged-in company account
function findMyCompany(userId) {
  return queryOne('SELECT * FROM companies WHERE user_id = $1', [userId]);
}

// What the dashboard shows about the company
function companyForOwner(row) {
  return {
    name: row.name,
    slug: row.slug,
    city: row.city,
    description: row.description,
    prices: JSON.parse(row.prices),
    subscriptionStatus: row.subscription_status,
    isLive: billing.LIVE_STATUSES.includes(row.subscription_status),
    hasStripeCustomer: Boolean(row.stripe_customer_id),
    plan: billing.PLAN,
    paymentsMode: billing.stripeIsSetUp() ? 'stripe' : (billing.demoPaymentsAllowed() ? 'demo' : 'off')
  };
}

// Saves a new subscription status (and Stripe ids when we get them)
async function saveSubscription(companyId, status, customerId, subscriptionId) {
  await query(
    `UPDATE companies SET subscription_status = $1,
       stripe_customer_id = COALESCE($2, stripe_customer_id),
       stripe_subscription_id = COALESCE($3, stripe_subscription_id)
     WHERE id = $4`,
    [status, customerId || null, subscriptionId || null, companyId]
  );
}

// The website's own address, e.g. https://quick-quote-nu.vercel.app (Stripe sends people back here)
function siteUrl(req) {
  return `${req.protocol}://${req.get('host')}`;
}

// ---------- The company's profile and prices ----------

// GET /api/my/company
router.get('/my/company', requireUser('company'), async (req, res) => {
  const row = await findMyCompany(req.user.id);
  if (!row) {
    return res.status(404).json({ error: 'No company found for this account.' });
  }
  res.json(companyForOwner(row));
});

// PUT /api/my/company  { name, city, description, prices }
// PUT = "replace this with my new version"
router.put('/my/company', requireUser('company'), async (req, res) => {
  const row = await findMyCompany(req.user.id);
  if (!row) {
    return res.status(404).json({ error: 'No company found for this account.' });
  }
  const body = req.body || {};
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const city = typeof body.city === 'string' ? body.city.trim() : '';
  const description = typeof body.description === 'string' ? body.description.trim() : '';

  if (name.length < 2 || name.length > 60) {
    return res.status(400).json({ error: 'The company name must be 2 to 60 characters.' });
  }
  if (city.length < 2 || city.length > 60) {
    return res.status(400).json({ error: 'The city must be 2 to 60 characters.' });
  }
  if (description.length > 500) {
    return res.status(400).json({ error: 'The description can be up to 500 characters.' });
  }
  const checked = validatePriceList(body.prices);
  if (checked.error) {
    return res.status(400).json({ error: checked.error });
  }

  // The slug (page address) stays the same, so links people saved keep working
  await query('UPDATE companies SET name = $1, city = $2, description = $3, prices = $4 WHERE id = $5',
    [name, city, description, JSON.stringify(checked.prices), row.id]);
  res.json(companyForOwner(await findMyCompany(req.user.id)));
});

// ---------- Requests ----------

// GET /api/my/requests
// A company sees the requests customers sent to it (with their name and email).
// A customer sees the requests they sent (with the company's name).
router.get('/my/requests', requireUser(), async (req, res) => {
  let rows;
  if (req.user.role === 'company') {
    rows = await query(
      `SELECT requests.*, users.name AS customer_name, users.email AS customer_email
       FROM requests
       JOIN companies ON companies.id = requests.company_id
       JOIN users ON users.id = requests.customer_id
       WHERE companies.user_id = $1
       ORDER BY requests.id DESC`,
      [req.user.id]
    );
  } else {
    rows = await query(
      `SELECT requests.*, companies.name AS company_name, companies.slug AS company_slug
       FROM requests JOIN companies ON companies.id = requests.company_id
       WHERE requests.customer_id = $1
       ORDER BY requests.id DESC`,
      [req.user.id]
    );
  }

  res.json(rows.map((row) => ({
    id: row.id,
    createdAt: row.created_at,
    service: row.service,
    rooms: row.rooms,
    frequency: row.frequency,
    extras: JSON.parse(row.extras),
    total: row.total_cents / 100, // 14450 cents -> 144.5 euros
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    companyName: row.company_name,
    companySlug: row.company_slug
  })));
});

// ---------- Payments ----------

// POST /api/billing/checkout: start paying. Answers with the address of
// Stripe's payment page; the browser then goes there.
router.post('/billing/checkout', requireUser('company'), async (req, res) => {
  const company = await findMyCompany(req.user.id);
  if (billing.LIVE_STATUSES.includes(company.subscription_status)) {
    return res.status(400).json({ error: 'Your subscription is already active.' });
  }

  if (billing.demoPaymentsAllowed()) {
    // Demo mode (your own computer only): no real payment, just switch it on
    await saveSubscription(company.id, 'active', null, null);
    return res.json({ url: '/dashboard.html?checkout=demo' });
  }
  if (!billing.stripeIsSetUp()) {
    return res.status(503).json({ error: 'Payments are not set up yet (STRIPE_SECRET_KEY is missing on the server).' });
  }

  const session = await billing.createCheckout(company, req.user.email, siteUrl(req));
  res.json({ url: session.url });
});

// POST /api/billing/confirm  { sessionId }
// After paying, Stripe sends the company back to the dashboard with a session id.
// We ask Stripe directly whether it was really paid (never trust the browser).
router.post('/billing/confirm', requireUser('company'), async (req, res) => {
  const sessionId = (req.body || {}).sessionId;
  if (typeof sessionId !== 'string' || !sessionId.startsWith('cs_') || !billing.stripeIsSetUp()) {
    return res.status(400).json({ error: 'This payment could not be checked.' });
  }
  const company = await findMyCompany(req.user.id);
  const session = await billing.getCheckout(sessionId);

  // The payment must belong to THIS company
  if (session.client_reference_id !== String(company.id)) {
    return res.status(400).json({ error: 'This payment belongs to a different account.' });
  }
  if (session.status === 'complete' && session.subscription) {
    const subscription = await billing.getSubscription(session.subscription);
    await saveSubscription(company.id, subscription.status, session.customer, session.subscription);
  }
  res.json(companyForOwner(await findMyCompany(req.user.id)));
});

// POST /api/billing/portal: Stripe's page to change the card or cancel
router.post('/billing/portal', requireUser('company'), async (req, res) => {
  const company = await findMyCompany(req.user.id);
  if (!billing.stripeIsSetUp() || !company.stripe_customer_id) {
    return res.status(400).json({ error: 'There is no Stripe subscription to manage yet.' });
  }
  const portal = await billing.createPortal(company.stripe_customer_id, siteUrl(req));
  res.json({ url: portal.url });
});

// POST /api/billing/webhook: Stripe tells us about changes (paid, failed, cancelled).
// server.js gives this route the RAW body, because the signature check needs
// the exact bytes Stripe sent.
async function stripeWebhook(req, res) {
  const event = billing.verifyWebhook(req.body, req.get('stripe-signature'));
  if (!event) {
    return res.status(400).json({ error: 'Invalid signature.' });
  }
  const object = event.data.object;

  if (event.type === 'checkout.session.completed' && object.mode === 'subscription') {
    const companyId = Number(object.client_reference_id);
    const status = object.payment_status === 'paid' ? 'active' : 'pending';
    await saveSubscription(companyId, status, object.customer, object.subscription);
  }

  if (event.type.startsWith('customer.subscription.')) {
    // created / updated / deleted: copy Stripe's status (deleted -> 'canceled')
    const status = event.type === 'customer.subscription.deleted' ? 'canceled' : object.status;
    const companyId = Number((object.metadata || {}).company_id);
    const row = companyId
      ? await queryOne('SELECT id FROM companies WHERE id = $1', [companyId])
      : await queryOne('SELECT id FROM companies WHERE stripe_subscription_id = $1', [object.id]);
    if (row) {
      await saveSubscription(row.id, status, object.customer, object.id);
    }
  }

  // Always answer 200 quickly, so Stripe knows we got the message
  res.json({ received: true });
}

module.exports = { router, stripeWebhook };
