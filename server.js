// QuickQuote server
// Express turns Node.js into a web server that answers browser requests.
const express = require('express');
const { PRICES, validateChoices, calculateQuote } = require('./prices');
const { saveRequest } = require('./storage');

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

// POST /api/requests: the customer sends their name, email and choices.
// The server checks everything, calculates the price again and saves it.
app.post('/api/requests', (req, res) => {
  const body = req.body || {};
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';

  if (name.length < 2 || name.length > 100) {
    return res.status(400).json({ error: 'Please enter your name (2 to 100 characters).' });
  }
  // A simple email check: something@something.something, with no spaces
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email) || email.length > 200) {
    return res.status(400).json({ error: 'Please enter a valid email address, like name@example.com.' });
  }
  const choicesError = validateChoices(body.choices);
  if (choicesError) {
    return res.status(400).json({ error: choicesError });
  }

  // Calculate the price on the server: never trust a price sent by the browser
  const quote = calculateQuote(body.choices);

  const saved = saveRequest({
    createdAt: new Date().toISOString(), // e.g. "2026-10-29T07:30:00.000Z"
    name: name,
    email: email,
    service: quote.service,
    rooms: quote.rooms,
    frequency: quote.frequency,
    // turn extra ids (like 'oven') into their names (like 'Inside oven')
    extras: PRICES.extras
      .filter((extra) => (body.choices.extras || []).includes(extra.id))
      .map((extra) => extra.name),
    total: quote.total
  });

  // 201 = "Created": a new item was saved
  res.status(201).json({ id: saved.id, message: 'Request saved.' });
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
