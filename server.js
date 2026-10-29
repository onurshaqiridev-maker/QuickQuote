// QuickQuote server
// Express turns Node.js into a web server that answers browser requests.
const express = require('express');
const { PRICES } = require('./prices');

const app = express();

// Hosting services like Render tell us which port to use through the PORT
// environment variable. On your own computer it isn't set, so we use 3000.
const PORT = process.env.PORT || 3000;

// Send every file in the "public" folder (HTML, CSS, JS) to the browser as-is.
// Visiting "/" automatically shows public/index.html.
app.use(express.static('public'));

// ---------- API routes ----------
// The API answers with data (JSON) instead of web pages.

// GET /api/services: the full price list, used to build the calculator form
app.get('/api/services', (req, res) => {
  res.json(PRICES);
});

// Start listening for requests.
app.listen(PORT, () => {
  console.log(`QuickQuote running at http://localhost:${PORT}`);
});
