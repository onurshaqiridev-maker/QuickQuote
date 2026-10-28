// QuickQuote server
// Express turns Node.js into a web server that answers browser requests.
const express = require('express');

const app = express();

// Hosting services like Render tell us which port to use through the PORT
// environment variable. On your own computer it isn't set, so we use 3000.
const PORT = process.env.PORT || 3000;

// Send every file in the "public" folder (HTML, CSS, JS) to the browser as-is.
// Visiting "/" automatically shows public/index.html.
app.use(express.static('public'));

// Start listening for requests.
app.listen(PORT, () => {
  console.log(`QuickQuote running at http://localhost:${PORT}`);
});
