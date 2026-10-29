// QuickQuote frontend
// This file runs in the visitor's browser. It asks the server for the price
// list, uses it to fill in the calculator form, and shows the price the
// server calculates. The price updates live whenever the form changes.

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
const resetButton = document.getElementById('reset-button');
const requestForm = document.getElementById('request-form');
const nameInput = document.getElementById('customer-name');
const emailInput = document.getElementById('customer-email');
const requestButton = document.getElementById('request-button');
const requestMessage = document.getElementById('request-message');
const liveTotal = document.getElementById('live-total');

// Filled in by loadPrices(); used to check the number of rooms
let roomLimits = { min: 1, max: 10 };

// ---------- 2. Helper: show a number as money, e.g. 40 -> "€40.00" ----------
// The formatters are made once (in setCurrency) and reused, which is faster
// than making a new one every time we show a price.
let moneyFormat;
let shortMoneyFormat;

function setCurrency(currency) {
  moneyFormat = new Intl.NumberFormat('en-IE', { style: 'currency', currency: currency });
  // Shorter version for the form labels: 40 -> "€40" (keeps phone labels short)
  shortMoneyFormat = new Intl.NumberFormat('en-IE', {
    style: 'currency', currency: currency, minimumFractionDigits: 0
  });
}
setCurrency('EUR');

function formatMoney(amount) {
  return moneyFormat.format(amount);
}

function formatShortMoney(amount) {
  return shortMoneyFormat.format(amount);
}

// ---------- 3. Build the form from the price list ----------
function buildForm(prices) {
  setCurrency(prices.currency);

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
  input.defaultChecked = checked; // the state the Reset button goes back to

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
    calculatePrice(true);      // show a price for the default choices straight away
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
// Counts requests, so an old, slow answer can't overwrite a newer one
let latestRequest = 0;

// isLive = true when called by a live update (then we don't move the cursor)
async function calculatePrice(isLive) {
  if (!checkRooms()) {
    showError('Please fix the number of rooms first.');
    if (!isLive) {
      roomsInput.focus();
    }
    return; // stop here: don't send bad data
  }

  latestRequest = latestRequest + 1;
  const thisRequest = latestRequest;

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

    // If the customer changed something while we waited, a newer request
    // is already on its way: ignore this older answer
    if (thisRequest !== latestRequest) {
      return;
    }

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
  requestForm.hidden = true; // no valid price, so nothing to request

  const title = document.createElement('h3');
  title.textContent = 'Your estimate';
  const text = document.createElement('p');
  text.className = 'error-message';
  text.textContent = message;

  resultBox.append(title, text);
  liveTotal.textContent = message; // read out loud by screen readers
}

// ---------- 8. Show the price breakdown in the result card ----------
function showQuote(quote) {
  resultBox.innerHTML = ''; // clear the old result
  resultBox.classList.remove('has-error');
  requestForm.hidden = false; // there is a price, so the customer can request it
  requestMessage.hidden = true; // a new price: hide the old "sent" message

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

  // Screen readers say e.g. "Estimated total: €144.50" (not the whole bill every time)
  liveTotal.textContent = `Estimated total: ${formatMoney(quote.total)}`;
}

// On phones the price card is below the form. After pressing "Calculate price",
// scroll down to it if it isn't on the screen already.
function scrollToResultIfHidden() {
  const box = resultBox.getBoundingClientRect();
  const isVisible = box.top >= 0 && box.top < window.innerHeight - 100;
  if (!isVisible) {
    resultBox.scrollIntoView({ block: 'start' });
  }
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
form.addEventListener('submit', async (event) => {
  event.preventDefault(); // stop the page from reloading
  await calculatePrice(false);
  // Only after a button press (never during live updates), and not when there
  // is an error: then the cursor stays in the field that needs fixing
  if (!resultBox.classList.contains('has-error')) {
    scrollToResultIfHidden();
  }
});

// ---------- 10. Live updates ----------
// Every change recalculates the price. We wait 300 milliseconds after the
// last change, so typing "10" sends one request instead of two.
let liveTimer = null;

function scheduleLiveUpdate() {
  clearTimeout(liveTimer); // cancel the previous wait
  liveTimer = setTimeout(() => calculatePrice(true), 300);
}

form.addEventListener('change', scheduleLiveUpdate); // dropdown, radios, checkboxes
roomsInput.addEventListener('input', scheduleLiveUpdate); // every key typed in the rooms box

// ---------- 11. Reset button ----------
// Puts every input back to its starting value and clears the result.
resetButton.addEventListener('click', () => {
  clearTimeout(liveTimer);        // cancel a live update that is still waiting
  latestRequest = latestRequest + 1; // ignore any answer that is still on its way
  form.reset();

  roomsError.hidden = true;
  roomsInput.removeAttribute('aria-invalid');
  resultBox.classList.remove('has-error');
  resultBox.innerHTML = '<h3>Your estimate</h3><p>Fill in the form to see your price.</p>';
  liveTotal.textContent = 'The form has been reset.';
  requestForm.hidden = true;
  requestMessage.hidden = true;
});

// ---------- 12. Send a quote request (name + email + choices) ----------
function showRequestMessage(text, isError) {
  requestMessage.textContent = text;
  requestMessage.className = isError ? 'request-message error-message' : 'request-message success-message';
  requestMessage.hidden = false;
}

requestForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  // Quick checks in the browser (the server checks again)
  const name = nameInput.value.trim();
  const email = emailInput.value.trim();
  if (name.length < 2) {
    showRequestMessage('Please enter your name.', true);
    nameInput.focus();
    return;
  }
  // Same rule as the server: something@something.something, with no spaces
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    showRequestMessage('Please enter a valid email address, like name@example.com.', true);
    emailInput.focus();
    return;
  }

  requestButton.disabled = true;
  requestButton.textContent = 'Sending…';

  try {
    const response = await fetch('/api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // We send the choices, not the price: the server works the price out itself
      body: JSON.stringify({ name: name, email: email, choices: getChoices() })
    });
    const data = await response.json();

    if (response.ok) {
      showRequestMessage(`Thank you, ${name}! Your request #${data.id} has been sent. We'll email you at ${email} within 24 hours.`, false);
      requestForm.reset(); // clear the name and email boxes
    } else {
      showRequestMessage(data.error || 'Sorry, we could not send your request.', true);
    }
  } catch (error) {
    console.error('Could not send the request:', error);
    showRequestMessage("We can't reach our server right now. Please try again in a moment.", true);
  } finally {
    requestButton.disabled = false;
    requestButton.textContent = 'Send request';
  }
});

loadPrices();
