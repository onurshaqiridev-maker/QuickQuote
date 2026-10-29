// QuickQuote storage
// Saves quote requests in a JSON file: a very simple "database".
// fs = "file system": Node's built-in tool for reading and writing files.
const fs = require('fs');
const path = require('path');

// The full path to data/requests.json, wherever the project folder is
const DATA_FILE = path.join(__dirname, 'data', 'requests.json');

// Returns every saved request as a list (an empty list if there are none yet)
function readRequests() {
  if (!fs.existsSync(DATA_FILE)) {
    return [];
  }
  const text = fs.readFileSync(DATA_FILE, 'utf8');
  return JSON.parse(text);
}

// Adds one request to the file and returns it with its new number (id)
function saveRequest(request) {
  const requests = readRequests();
  const saved = { id: requests.length + 1, ...request }; // "..." copies all the fields
  requests.push(saved);

  // Make sure the "data" folder exists, then write the whole list back.
  // JSON.stringify(list, null, 2) makes the file nicely indented and easy to read.
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(requests, null, 2));
  return saved;
}

module.exports = { readRequests, saveRequest };
