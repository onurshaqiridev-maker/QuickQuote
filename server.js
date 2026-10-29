// QuickQuote server
// Express turns Node.js into a web server that answers browser requests.
const express = require('express');
const { PRICES, calculateQuote } = require('./prices');

const app = express();

// Hosting services like Render tell us which port to use through the PORT
// environment variable. On your own computer it isn't set, so we use 3000.
const PORT = process.env.PORT || 3000;

// Send every file in the "public" folder (HTML, CSS, JS) to the browser as-is.
// Visiting "/" automatically shows public/index.html.
app.use(express.static('public'));

// Read JSON sent by the browser (for POST requests) and put it in req.body
app.use(express.json());

// ---------- API routes ----------
// The API answers with data (JSON) instead of web pages.

// GET /api/services: the full price list, used to build the calculator form
app.get('/api/services', (req, res) => {
  res.json(PRICES);
});

// POST /api/quote: the browser sends the customer's choices, the server
// calculates the price and sends back the full breakdown
app.post('/api/quote', (req, res) => {
  const quote = calculateQuote(req.body);
  res.json(quote);
});

// Start listening for requests.
app.listen(PORT, () => {
  console.log(`QuickQuote running at http://localhost:${PORT}`);
});
