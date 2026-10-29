// QuickQuote frontend
// This file runs in the visitor's browser. It asks the server for the price
// list, uses it to fill in the calculator form, and shows the price the
// server calculates.

// ---------- 1. Find the HTML elements we need ----------
const form = document.getElementById('quote-form');
const serviceSelect = document.getElementById('service');
const roomsInput = document.getElementById('rooms');
const frequencyBox = document.getElementById('frequency-options');
const extrasBox = document.getElementById('extras-options');
const formMessage = document.getElementById('form-message');
const resultBox = document.getElementById('result');

// ---------- 2. Helper: show a number as money, e.g. 40 -> "€40.00" ----------
let currency = 'EUR';

function formatMoney(amount) {
  return new Intl.NumberFormat('en-IE', { style: 'currency', currency: currency }).format(amount);
}

// Shorter version for the form labels: 40 -> "€40" (keeps phone labels short)
function formatShortMoney(amount) {
  return new Intl.NumberFormat('en-IE', {
    style: 'currency', currency: currency, minimumFractionDigits: 0
  }).format(amount);
}

// ---------- 3. Build the form from the price list ----------
function buildForm(prices) {
  currency = prices.currency;

  // Room limits come from the server too
  roomsInput.min = prices.rooms.min;
  roomsInput.max = prices.rooms.max;

  // Services -> <option> elements in the dropdown
  prices.services.forEach((service) => {
    const option = document.createElement('option');
    option.value = service.id;
    option.textContent = `${service.name} (${formatShortMoney(service.basePrice)} + ${formatShortMoney(service.pricePerRoom)}/room)`;
    serviceSelect.appendChild(option);
  });

  // Frequencies -> radio buttons (only one can be chosen)
  prices.frequencies.forEach((frequency, index) => {
    let text = frequency.name;
    if (frequency.discount > 0) {
      text += ` (${frequency.discount * 100}% off)`;
    }
    const isFirst = index === 0; // "One-time" is selected by default
    frequencyBox.appendChild(makeChoice('radio', 'frequency', frequency.id, text, isFirst));
  });

  // Extras -> checkboxes (any number can be chosen)
  prices.extras.forEach((extra) => {
    const text = `${extra.name} (+${formatShortMoney(extra.price)})`;
    extrasBox.appendChild(makeChoice('checkbox', 'extras', extra.id, text, false));
  });
}

// Creates: <label class="choice"><input type="..." name="..." value="..."> text</label>
// Wrapping the input in its label means clicking the text also ticks the box.
function makeChoice(type, name, value, text, checked) {
  const label = document.createElement('label');
  label.className = 'choice';

  const input = document.createElement('input');
  input.type = type;
  input.name = name;
  input.value = value;
  input.checked = checked;

  label.appendChild(input);
  label.append(' ' + text);
  return label;
}

// ---------- 4. Ask the server for the prices ----------
async function loadPrices() {
  try {
    const response = await fetch('/api/services'); // send the request
    if (!response.ok) {
      throw new Error('Server answered with status ' + response.status);
    }
    const prices = await response.json(); // turn the JSON text into an object
    buildForm(prices);
    formMessage.hidden = true; // prices loaded: hide "Loading prices…"
  } catch (error) {
    console.error('Could not load prices:', error);
    formMessage.textContent = 'Sorry, we could not load our prices. Please refresh the page.';
  }
}

// ---------- 5. Read what the customer chose ----------
function getChoices() {
  const checkedFrequency = form.querySelector('input[name="frequency"]:checked');
  const checkedExtras = form.querySelectorAll('input[name="extras"]:checked');

  return {
    service: serviceSelect.value,
    rooms: Number(roomsInput.value),
    frequency: checkedFrequency.value,
    // turn the list of ticked checkboxes into a list of ids, e.g. ['oven', 'fridge']
    extras: Array.from(checkedExtras).map((box) => box.value)
  };
}

// ---------- 6. Send the choices to the server and get the price back ----------
async function calculatePrice() {
  try {
    const response = await fetch('/api/quote', {
      method: 'POST',                                  // POST = we are sending data
      headers: { 'Content-Type': 'application/json' }, // the data is JSON
      body: JSON.stringify(getChoices())               // object -> JSON text
    });
    const quote = await response.json();
    showQuote(quote);
  } catch (error) {
    console.error('Could not calculate the price:', error);
    resultBox.innerHTML = '<h3>Your estimate</h3><p>Sorry, something went wrong. Please try again.</p>';
  }
}

// ---------- 7. Show the price breakdown in the result card ----------
function showQuote(quote) {
  resultBox.innerHTML = ''; // clear the old result

  const title = document.createElement('h3');
  title.textContent = 'Your estimate';
  resultBox.appendChild(title);

  // Short summary, e.g. "Deep clean · 3 rooms · Weekly"
  const summary = document.createElement('p');
  summary.className = 'summary';
  const roomWord = quote.rooms === 1 ? 'room' : 'rooms';
  summary.textContent = `${quote.service} · ${quote.rooms} ${roomWord} · ${quote.frequency}`;
  resultBox.appendChild(summary);

  // The bill: one row per line, then subtotal, discount and total
  const list = document.createElement('ul');
  list.className = 'breakdown';
  quote.lines.forEach((line) => {
    addRow(list, line.label, formatMoney(line.amount), '');
  });
  if (quote.discount > 0) {
    addRow(list, 'Subtotal', formatMoney(quote.subtotal), 'subtotal-row');
    addRow(list, `${quote.frequency} discount (${quote.discountPercent}%)`, '−' + formatMoney(quote.discount), 'discount-row');
  }
  addRow(list, 'Total', formatMoney(quote.total), 'total-row');
  resultBox.appendChild(list);
}

// Adds one row: <li class="..."><span>label</span><span>amount</span></li>
function addRow(list, label, amount, className) {
  const row = document.createElement('li');
  row.className = className;

  const labelSpan = document.createElement('span');
  labelSpan.textContent = label;
  const amountSpan = document.createElement('span');
  amountSpan.textContent = amount;

  row.append(labelSpan, amountSpan);
  list.appendChild(row);
}

// ---------- 8. When the form is submitted, calculate instead of reloading ----------
form.addEventListener('submit', (event) => {
  event.preventDefault(); // stop the page from reloading
  calculatePrice();
});

loadPrices();
