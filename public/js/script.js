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
const roomsError = document.getElementById('rooms-error');
const calculateButton = document.getElementById('calculate-button');

// Filled in by loadPrices(); used to check the number of rooms
let roomLimits = { min: 1, max: 10 };

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
  roomLimits = prices.rooms;
  roomsInput.min = roomLimits.min;
  roomsInput.max = roomLimits.max;

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
    calculateButton.disabled = true; // the form is empty, so there is nothing to calculate
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

// ---------- 6. Check the form before sending it ----------
// The server checks everything too, but checking here gives instant feedback.
function checkRooms() {
  const rooms = Number(roomsInput.value);
  const isValid = roomsInput.value !== '' && Number.isInteger(rooms)
    && rooms >= roomLimits.min && rooms <= roomLimits.max;

  if (isValid) {
    roomsError.hidden = true;
    roomsInput.removeAttribute('aria-invalid');
  } else {
    roomsError.textContent = `Please enter a whole number of rooms from ${roomLimits.min} to ${roomLimits.max}.`;
    roomsError.hidden = false;
    roomsInput.setAttribute('aria-invalid', 'true'); // tells screen readers the field is wrong
  }
  return isValid;
}

// ---------- 7. Send the choices to the server and get the price back ----------
async function calculatePrice() {
  if (!checkRooms()) {
    showError('Please fix the number of rooms first.');
    roomsInput.focus();
    return; // stop here: don't send bad data
  }

  // "Calculating…" state: the button can't be clicked twice
  calculateButton.disabled = true;
  calculateButton.textContent = 'Calculating…';

  try {
    const response = await fetch('/api/quote', {
      method: 'POST',                                  // POST = we are sending data
      headers: { 'Content-Type': 'application/json' }, // the data is JSON
      body: JSON.stringify(getChoices())               // object -> JSON text
    });
    const data = await response.json();

    if (response.ok) {
      showQuote(data);
    } else {
      // The server said no (status 400) and explained why in data.error
      showError(data.error || 'Sorry, we could not calculate that price.');
    }
  } catch (error) {
    // fetch itself failed: no internet, or the server is down
    console.error('Could not reach the server:', error);
    showError("We can't reach our server right now. Please check your internet connection and try again.");
  } finally {
    // "finally" runs whether it worked or not: put the button back
    calculateButton.disabled = false;
    calculateButton.textContent = 'Calculate price';
  }
}

// Shows an error message in the result card
function showError(message) {
  resultBox.innerHTML = '';
  resultBox.classList.add('has-error');

  const title = document.createElement('h3');
  title.textContent = 'Your estimate';
  const text = document.createElement('p');
  text.className = 'error-message';
  text.textContent = message;

  resultBox.append(title, text);
}

// ---------- 8. Show the price breakdown in the result card ----------
function showQuote(quote) {
  resultBox.innerHTML = ''; // clear the old result
  resultBox.classList.remove('has-error');

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

// ---------- 9. When the form is submitted, calculate instead of reloading ----------
form.addEventListener('submit', (event) => {
  event.preventDefault(); // stop the page from reloading
  calculatePrice();
});

// Hide the rooms message as soon as the number is fixed
roomsInput.addEventListener('input', () => {
  if (!roomsError.hidden) {
    checkRooms();
  }
});

loadPrices();
