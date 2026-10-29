// QuickQuote billing: companies pay a monthly fee with Stripe
// We talk to Stripe's API directly with fetch(), so no extra package is needed.
//
// Environment variables (from your Stripe dashboard, in TEST mode):
//   STRIPE_SECRET_KEY      starts with sk_test_...   (Developers → API keys)
//   STRIPE_WEBHOOK_SECRET  starts with whsec_...     (Developers → Webhooks)
// Without STRIPE_SECRET_KEY you can turn on DEMO_PAYMENTS=true on your own
// computer: then the "Pay" button just activates the company (no Stripe at all).
const crypto = require('crypto');

// What a company pays to be listed
const PLAN = {
  name: 'QuickQuote company listing',
  amountCents: 900, // €9.00
  currency: 'eur',
  interval: 'month'
};

// Stripe statuses that mean "paid up": the company is shown to customers
const LIVE_STATUSES = ['active', 'trialing'];

// Only changed for automated tests; normally it's Stripe's real address
const STRIPE_API = process.env.STRIPE_API_URL || 'https://api.stripe.com';

function stripeIsSetUp() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

// Demo mode: only when Stripe is not set up, and never on Vercel (online)
function demoPaymentsAllowed() {
  return !stripeIsSetUp() && process.env.DEMO_PAYMENTS === 'true' && !process.env.VERCEL;
}

// Stripe wants "form" data, with nested values written like
// line_items[0][price_data][currency]=eur. This turns a normal object into that.
function toFormData(object, prefix, form = new URLSearchParams()) {
  for (const [key, value] of Object.entries(object)) {
    const name = prefix ? `${prefix}[${key}]` : key;
    if (value !== null && typeof value === 'object') {
      toFormData(value, name, form); // arrays work too: their keys are 0, 1, 2...
    } else if (value !== undefined) {
      form.append(name, String(value));
    }
  }
  return form;
}

// Sends one request to Stripe and returns the answer as an object
async function stripe(method, url, data) {
  const response = await fetch(STRIPE_API + url, {
    method: method,
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: data ? toFormData(data).toString() : undefined
  });
  const result = await response.json();
  if (!response.ok) {
    // Stripe explains the problem in result.error.message
    const error = new Error('Stripe: ' + (result.error ? result.error.message : response.status));
    error.isStripeError = true;
    throw error;
  }
  return result;
}

// Creates a Stripe Checkout page for one company and returns its address.
// The company is sent there to type in its card (test card: 4242 4242 4242 4242).
function createCheckout(company, email, siteUrl) {
  const data = {
    mode: 'subscription',
    customer_email: company.stripe_customer_id ? undefined : email,
    customer: company.stripe_customer_id || undefined,
    client_reference_id: String(company.id), // so we know which company paid
    line_items: [{
      quantity: 1,
      price_data: {
        currency: PLAN.currency,
        unit_amount: PLAN.amountCents,
        recurring: { interval: PLAN.interval },
        product_data: { name: PLAN.name }
      }
    }],
    subscription_data: { metadata: { company_id: String(company.id) } },
    // {CHECKOUT_SESSION_ID} is filled in by Stripe
    success_url: `${siteUrl}/dashboard.html?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/dashboard.html?checkout=canceled`
  };
  return stripe('POST', '/v1/checkout/sessions', data);
}

function getCheckout(sessionId) {
  return stripe('GET', `/v1/checkout/sessions/${encodeURIComponent(sessionId)}`);
}

function getSubscription(subscriptionId) {
  return stripe('GET', `/v1/subscriptions/${encodeURIComponent(subscriptionId)}`);
}

// Stripe's own page where a company can change its card or cancel
function createPortal(customerId, siteUrl) {
  return stripe('POST', '/v1/billing_portal/sessions', {
    customer: customerId,
    return_url: `${siteUrl}/dashboard.html`
  });
}

// ---------- Webhooks ----------
// Stripe calls our server when something changes (a payment fails, a company
// cancels...). Anyone could call that address, so Stripe signs each message
// with STRIPE_WEBHOOK_SECRET. We check the signature before trusting it.
// The header looks like: "t=1700000000,v1=5257a869e7ec...".
function verifyWebhook(rawBody, signatureHeader) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !signatureHeader) {
    return null;
  }
  const parts = {};
  const signatures = [];
  for (const piece of signatureHeader.split(',')) {
    const [key, value] = piece.split('=');
    if (key === 'v1') {
      signatures.push(value);
    } else {
      parts[key] = value;
    }
  }
  const timestamp = Number(parts.t);
  // Refuse old messages (more than 5 minutes), so a copied message can't be replayed later
  if (!timestamp || Math.abs(Date.now() / 1000 - timestamp) > 300) {
    return null;
  }

  const expected = crypto.createHmac('sha256', secret)
    .update(`${parts.t}.${rawBody.toString('utf8')}`)
    .digest('hex');
  const matches = signatures.some((signature) =>
    signature.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected)));

  return matches ? JSON.parse(rawBody.toString('utf8')) : null;
}

module.exports = {
  PLAN, LIVE_STATUSES, stripeIsSetUp, demoPaymentsAllowed,
  createCheckout, getCheckout, getSubscription, createPortal, verifyWebhook
};
