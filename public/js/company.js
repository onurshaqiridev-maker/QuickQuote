// QuickQuote company page: one company's price calculator.
// The address looks like /company.html?c=sparkle-home-cleaning
// Uses api(), el(), formatMoney(), formatShortMoney() and currentUser from common.js.

// ---------- 1. Find the HTML elements we need ----------
const slug = new URLSearchParams(window.location.search).get('c') || '';
const form = document.getElementById('quote-form');
const serviceSelect = document.getElementById('service');
const roomsInput = document.getElementById('rooms');
const frequencyBox = document.getElementById('frequency-options');
const extrasGroup = document.getElementById('extras-group');
const extrasBox = document.getElementById('extras-options');
const formMessage = document.getElementById('form-message');
const layout = document.getElementById('calculator-layout');
const resultBox = document.getElementById('result');
const roomsError = document.getElementById('rooms-error');
const calculateButton = document.getElementById('calculate-button');
const resetButton = document.getElementById('reset-button');
const requestBox = document.getElementById('request-box');
const requestContent = document.getElementById('request-content');
const requestMessage = document.getElementById('request-message');
const liveTotal = document.getElementById('live-total');

// Every address for this company starts with this
const companyApi = `/api/companies/${encodeURIComponent(slug)}`;

let roomLimits = { min: 1, max: 10 };
let lastQuote = null; // the latest valid price, used by "Send request"

// ---------- 2. Show the company and build the form from its prices ----------
function showCompany(company) {
  document.title = `${company.name} | QuickQuote`;
  document.getElementById('company-name').textContent = company.name;
  document.getElementById('company-city').textContent = company.city;
  document.getElementById('company-description').textContent = company.description;
  buildForm(company.prices);
}

function buildForm(prices) {
  roomLimits = prices.rooms;
  roomsInput.min = roomLimits.min;
  roomsInput.max = roomLimits.max;

  prices.services.forEach((service) => {
    const option = document.createElement('option');
    option.value = service.id;
    option.textContent = `${service.name} (${formatShortMoney(service.basePrice)} + ${formatShortMoney(service.pricePerRoom)}/room)`;
    serviceSelect.appendChild(option);
  });

  prices.frequencies.forEach((frequency, index) => {
    let text = frequency.name;
    if (frequency.discount > 0) {
      text += ` (${Math.round(frequency.discount * 1000) / 10}% off)`;
    }
    frequencyBox.appendChild(makeChoice('radio', 'frequency', frequency.id, text, index === 0));
  });

  prices.extras.forEach((extra) => {
    extrasBox.appendChild(makeChoice('checkbox', 'extras', extra.id, `${extra.name} (+${formatShortMoney(extra.price)})`, false));
  });
  extrasGroup.hidden = prices.extras.length === 0;
}

// Creates: <label class="choice"><input type="..." name="..." value="..."> text</label>
function makeChoice(type, name, value, text, checked) {
  const label = el('label', 'choice');
  const input = document.createElement('input');
  input.type = type;
  input.name = name;
  input.value = value;
  input.checked = checked;
  input.defaultChecked = checked; // the state the Reset button goes back to
  label.append(input, ' ' + text);
  return label;
}

// ---------- 3. Load the company ----------
async function loadCompany() {
  if (!slug) {
    showPageError('No company was chosen.');
    return;
  }
  const result = await api(companyApi);
  if (!result.ok) {
    showPageError(result.data.error || 'Sorry, we could not load this company.');
    return;
  }
  showCompany(result.data);
  formMessage.hidden = true;

  // The owner looking at their own page before paying sees a note
  const me = await currentUser;
  if (me.company && me.company.slug === slug && !['active', 'trialing'].includes(me.company.subscriptionStatus)) {
    document.getElementById('preview-note').hidden = false;
  }
  calculatePrice(true); // show a price for the default choices straight away
}

function showPageError(message) {
  document.getElementById('company-name').textContent = 'Company not found';
  formMessage.textContent = message + ' ';
  const back = el('a', '', 'See all companies');
  back.href = '/';
  formMessage.appendChild(back);
  layout.hidden = true;
}

// ---------- 4. Read and check the form ----------
function getChoices() {
  const checkedFrequency = form.querySelector('input[name="frequency"]:checked');
  const checkedExtras = form.querySelectorAll('input[name="extras"]:checked');
  return {
    service: serviceSelect.value,
    rooms: Number(roomsInput.value),
    frequency: checkedFrequency ? checkedFrequency.value : '',
    extras: Array.from(checkedExtras).map((box) => box.value)
  };
}

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
    roomsInput.setAttribute('aria-invalid', 'true');
  }
  return isValid;
}

// ---------- 5. Ask the server for the price ----------
let latestRequest = 0; // so an old, slow answer can't overwrite a newer one

async function calculatePrice(isLive) {
  if (!checkRooms()) {
    showError('Please fix the number of rooms first.');
    if (!isLive) {
      roomsInput.focus();
    }
    return;
  }

  latestRequest = latestRequest + 1;
  const thisRequest = latestRequest;
  calculateButton.disabled = true;
  calculateButton.textContent = 'Calculating…';

  const result = await api(`${companyApi}/quote`, { method: 'POST', body: getChoices() });

  if (thisRequest === latestRequest) {
    if (result.ok) {
      showQuote(result.data);
    } else {
      showError(result.data.error || 'Sorry, we could not calculate that price.');
    }
  }
  calculateButton.disabled = false;
  calculateButton.textContent = 'Calculate price';
}

function showError(message) {
  lastQuote = null;
  resultBox.innerHTML = '';
  resultBox.classList.add('has-error');
  requestBox.hidden = true;
  resultBox.append(el('h3', '', 'Your estimate'), el('p', 'error-message', message));
  liveTotal.textContent = message;
}

// ---------- 6. Show the price breakdown ----------
function showQuote(quote) {
  lastQuote = quote;
  resultBox.innerHTML = '';
  resultBox.classList.remove('has-error');
  resultBox.appendChild(el('h3', '', 'Your estimate'));

  const roomWord = quote.rooms === 1 ? 'room' : 'rooms';
  resultBox.appendChild(el('p', 'summary', `${quote.service} · ${quote.rooms} ${roomWord} · ${quote.frequency}`));

  const list = el('ul', 'breakdown');
  quote.lines.forEach((line) => addRow(list, line.label, formatMoney(line.amount), ''));
  if (quote.discount > 0) {
    addRow(list, 'Subtotal', formatMoney(quote.subtotal), 'subtotal-row');
    addRow(list, `${quote.frequency} discount (${quote.discountPercent}%)`, '−' + formatMoney(quote.discount), 'discount-row');
  }
  addRow(list, 'Total', formatMoney(quote.total), 'total-row');
  resultBox.appendChild(list);

  liveTotal.textContent = `Estimated total: ${formatMoney(quote.total)}`;
  requestBox.hidden = false;
  requestMessage.hidden = true;
}

function addRow(list, label, amount, className) {
  const row = el('li', className);
  row.append(el('span', '', label), el('span', '', amount));
  list.appendChild(row);
}

function scrollToResultIfHidden() {
  const box = resultBox.getBoundingClientRect();
  if (!(box.top >= 0 && box.top < window.innerHeight - 100)) {
    resultBox.scrollIntoView({ block: 'start' });
  }
}

// ---------- 7. Calculate button, live updates and Reset ----------
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  await calculatePrice(false);
  if (!resultBox.classList.contains('has-error')) {
    scrollToResultIfHidden();
  }
});

let liveTimer = null;
function scheduleLiveUpdate() {
  clearTimeout(liveTimer);
  liveTimer = setTimeout(() => calculatePrice(true), 300); // wait until typing stops
}
form.addEventListener('change', scheduleLiveUpdate);
roomsInput.addEventListener('input', scheduleLiveUpdate);

resetButton.addEventListener('click', () => {
  clearTimeout(liveTimer);
  latestRequest = latestRequest + 1; // ignore any answer still on its way
  form.reset();
  lastQuote = null;
  roomsError.hidden = true;
  roomsInput.removeAttribute('aria-invalid');
  resultBox.classList.remove('has-error');
  resultBox.innerHTML = '';
  resultBox.append(el('h3', '', 'Your estimate'), el('p', '', 'Fill in the form to see your price.'));
  liveTotal.textContent = 'The form has been reset.';
  requestBox.hidden = true;
});

// ---------- 8. "Request this quote": depends on who is logged in ----------
async function setUpRequestBox() {
  const me = await currentUser;
  requestContent.innerHTML = '';
  // After logging in, come back to this same page
  const here = encodeURIComponent(window.location.pathname + window.location.search);

  if (!me.user) {
    // Not logged in: a customer account is needed to send a request
    const text = el('p', 'request-intro', 'Create a free customer account (or log in) to send this request to the company.');
    const signup = el('a', 'button', 'Sign up free');
    signup.href = `/signup.html?role=customer&next=${here}`;
    const login = el('a', 'button button-secondary', 'Log in');
    login.href = `/login.html?next=${here}`;
    const actions = el('div', 'button-row');
    actions.append(signup, login);
    requestContent.append(text, actions);
    return;
  }

  if (me.user.role === 'company') {
    requestContent.appendChild(el('p', 'request-intro', 'You are logged in as a company. Log in with a customer account to send requests.'));
    return;
  }

  const text = el('p', 'request-intro', `We'll send your request with your account details (${me.user.name}, ${me.user.email}). The company will contact you to confirm a date.`);
  const button = el('button', 'button', 'Send request');
  button.type = 'button';
  button.addEventListener('click', () => sendRequest(button));
  requestContent.append(text, button);
}

async function sendRequest(button) {
  if (!lastQuote) {
    return;
  }
  button.disabled = true;
  button.textContent = 'Sending…';

  // We send the choices, not the price: the server works the price out itself
  const result = await api(`${companyApi}/requests`, { method: 'POST', body: { choices: getChoices() } });

  requestMessage.hidden = false;
  if (result.ok) {
    requestMessage.className = 'request-message success-message';
    requestMessage.textContent = `Thank you! Request #${result.data.id} (${formatMoney(result.data.total)}) was sent to ${result.data.company}. `;
    const link = el('a', '', 'See my requests');
    link.href = '/dashboard.html';
    requestMessage.appendChild(link);
  } else {
    requestMessage.className = 'request-message error-message';
    requestMessage.textContent = result.data.error || 'Sorry, we could not send your request.';
  }
  button.disabled = false;
  button.textContent = 'Send request';
}

loadCompany();
setUpRequestBox();
