// QuickQuote server
// A marketplace: cleaning companies pay a monthly fee to be listed, and
// customers search the companies, see their prices and send quote requests.
const express = require('express');
const path = require('path');
const authRoutes = require('./routes/auth');
const companyRoutes = require('./routes/companies');
const accountRoutes = require('./routes/account');

const app = express();

// Hosting services like Vercel tell us which port to use through the PORT
// environment variable. On your own computer it isn't set, so we use 3000.
const PORT = process.env.PORT || 3000;

// Online, the site runs behind Vercel's servers. This line makes Express trust
// them, so req.secure and req.protocol show "https" correctly (needed for cookies).
app.set('trust proxy', 1);

// Send every file in the "public" folder (HTML, CSS, JS) to the browser as-is.
app.use(express.static(path.join(__dirname, 'public')));

// The Stripe webhook needs the RAW body (exact bytes) to check the signature,
// so it is set up BEFORE express.json() turns bodies into objects.
app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), accountRoutes.stripeWebhook);

// Read JSON sent by the browser and put it in req.body
app.use(express.json());

// ---------- API routes ----------
app.use('/api/auth', authRoutes.router);           // sign up, log in, log out, me
app.use('/api/companies', companyRoutes.router);   // list, search, prices, quote, request
app.use('/api', accountRoutes.router);             // dashboard and payments

// Any other /api address doesn't exist
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found.' });
});

// ---------- Error handler ----------
// Express sends any unexpected error here (for example, broken JSON).
// We answer with a short JSON message instead of a long error page.
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'The data sent was not valid JSON.' });
  }
  console.error(err);
  if (err.isStripeError) {
    // 502 = "a service we depend on (Stripe) had a problem"
    return res.status(502).json({ error: 'The payment service had a problem. Please try again.' });
  }
  res.status(500).json({ error: 'Something went wrong on the server. Please try again.' });
});

// Start listening only when this file is run directly ("npm start").
// On Vercel, Vercel loads the app itself (module.exports) and handles the listening.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`QuickQuote running at http://localhost:${PORT}`);
  });
}

module.exports = app;
