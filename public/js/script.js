// QuickQuote frontend
// This file runs in the visitor's browser. It asks the server for the price
// list and uses it to fill in the calculator form.

// ---------- 1. Find the HTML elements we need ----------
const form = document.getElementById('quote-form');
const serviceSelect = document.getElementById('service');
const roomsInput = document.getElementById('rooms');
const frequencyBox = document.getElementById('frequency-options');
const extrasBox = document.getElementById('extras-options');
const formMessage = document.getElementById('form-message');

// ---------- 2. Helper: show a number as money, e.g. 40 -> "€40.00" ----------
let currency = 'EUR';

function formatMoney(amount) {
  return new Intl.NumberFormat('en-IE', { style: 'currency', currency: currency }).format(amount);
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
    option.textContent = `${service.name} (${formatMoney(service.basePrice)} + ${formatMoney(service.pricePerRoom)} per room)`;
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
    const text = `${extra.name} (+${formatMoney(extra.price)})`;
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

// ---------- 5. Stop the form from reloading the page ----------
// The real price calculation is connected in Task 9.
form.addEventListener('submit', (event) => {
  event.preventDefault();
});

loadPrices();
