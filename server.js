// QuickQuote server
// Express turns Node.js into a web server that answers browser requests.
const express = require('express');
const { PRICES, validateChoices, calculateQuote } = require('./prices');

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
  // Never trust data from the browser: check it first
  const error = validateChoices(req.body);
  if (error) {
    // 400 = "Bad Request": the problem is in what was sent, not in the server
    return res.status(400).json({ error: error });
  }

  const quote = calculateQuote(req.body);
  res.json(quote);
});

// ---------- Error handler ----------
// Express sends any unexpected error here (for example, broken JSON).
// We answer with a short JSON message instead of a long error page.
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'The data sent was not valid JSON.' });
  }
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server. Please try again.' });
});

// Start listening for requests.
app.listen(PORT, () => {
  console.log(`QuickQuote running at http://localhost:${PORT}`);
});
