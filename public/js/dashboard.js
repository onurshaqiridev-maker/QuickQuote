// QuickQuote dashboard ("My account")
// Companies: subscription, profile, price editor and the requests they received.
// Customers: the requests they sent.
// Uses api(), el(), formatMoney(), formatDate() and currentUser from common.js.

const pageMessage = document.getElementById('page-message');

function showPageMessage(text) {
  pageMessage.textContent = text;
  pageMessage.hidden = false;
}

// ---------- 1. Subscription (companies) ----------
const STATUS_TEXT = {
  pending: ['Not paid yet', 'Your company is not visible to customers yet. Pay the monthly fee to appear in the search.'],
  active: ['Active', 'Your company is live: customers can find it, see your prices and send requests.'],
  trialing: ['Active', 'Your company is live: customers can find it, see your prices and send requests.'],
  past_due: ['Payment problem', 'Your last payment failed, so your company is hidden. Update your card under "Manage subscription".'],
  unpaid: ['Payment problem', 'Your payment failed, so your company is hidden. Update your card under "Manage subscription".'],
  canceled: ['Cancelled', 'Your subscription has ended, so your company is hidden. Pay again to come back.'],
  incomplete: ['Not paid yet', 'The payment was not finished. Please try again.'],
  incomplete_expired: ['Not paid yet', 'The payment was not finished. Please try again.']
};

function showSubscription(company) {
  const [label, text] = STATUS_TEXT[company.subscriptionStatus] || ['Unknown', 'Please contact us.'];
  const badge = document.getElementById('status-badge');
  badge.textContent = label;
  badge.className = company.isLive ? 'badge badge-good' : 'badge badge-warning';
  document.getElementById('status-text').textContent = text;
  document.getElementById('public-link').href = `/company.html?c=${encodeURIComponent(company.slug)}`;

  const payButton = document.getElementById('pay-button');
  const price = formatMoney(company.plan.amountCents / 100);
  payButton.textContent = company.paymentsMode === 'demo' ? `Pay ${price}/month (demo)` : `Pay ${price}/month`;
  payButton.hidden = company.isLive;
  // The Stripe page for changing the card or cancelling (only after a Stripe payment)
  document.getElementById('portal-button').hidden = !company.hasStripeCustomer;
}

// Asks the server for a payment page address, then goes there
async function goToBilling(url, button) {
  const planMessage = document.getElementById('plan-message');
  planMessage.hidden = true;
  button.disabled = true;
  const result = await api(url, { method: 'POST' });
  if (result.ok) {
    window.location.href = result.data.url; // Stripe's page (or back here in demo mode)
    return;
  }
  button.disabled = false;
  planMessage.textContent = result.data.error || 'Sorry, something went wrong.';
  planMessage.hidden = false;
}

document.getElementById('pay-button').addEventListener('click', (event) => goToBilling('/api/billing/checkout', event.target));
document.getElementById('portal-button').addEventListener('click', (event) => goToBilling('/api/billing/portal', event.target));

// ---------- 2. Price editor (companies) ----------
const servicesEditor = document.getElementById('services-editor');
const extrasEditor = document.getElementById('extras-editor');
const frequenciesEditor = document.getElementById('frequencies-editor');
let frequencyNames = []; // [{ id, name }], filled from the saved prices

// A small labelled input: <label>Base price (€) <input ...></label>
function field(labelText, type, value, extraClass) {
  const label = el('label', 'mini-field ' + (extraClass || ''));
  label.append(el('span', '', labelText));
  const input = document.createElement('input');
  input.type = type;
  input.value = value;
  if (type === 'number') {
    input.min = '0';
    input.step = '0.01';
    input.inputMode = 'decimal'; // number keyboard with a decimal point on phones
  } else {
    input.maxLength = 60;
  }
  label.appendChild(input);
  return label;
}

// One editor row with a Remove button. "fields" are made with field().
function editorRow(fields, removeLabel, list, minimumRows) {
  const row = el('div', 'editor-row');
  const remove = el('button', 'link-button remove-button', 'Remove');
  remove.type = 'button';
  remove.setAttribute('aria-label', removeLabel);
  remove.addEventListener('click', () => {
    if (list.children.length > minimumRows) {
      row.remove();
    }
  });
  row.append(...fields, remove);
  return row;
}

function addServiceRow(service) {
  if (servicesEditor.children.length >= 10) {
    return;
  }
  const name = service.name || '';
  servicesEditor.appendChild(editorRow([
    field('Service name', 'text', name, 'field-name'),
    field('Base price (€)', 'number', service.basePrice ?? '', ''),
    field('Per room (€)', 'number', service.pricePerRoom ?? '', '')
  ], `Remove service ${name}`.trim(), servicesEditor, 1));
}

function addExtraRow(extra) {
  if (extrasEditor.children.length >= 10) {
    return;
  }
  const name = extra.name || '';
  extrasEditor.appendChild(editorRow([
    field('Extra name', 'text', name, 'field-name'),
    field('Price (€)', 'number', extra.price ?? '', '')
  ], `Remove extra ${name}`.trim(), extrasEditor, 0));
}

function fillProfile(company) {
  document.getElementById('profile-name').value = company.name;
  document.getElementById('profile-city').value = company.city;
  document.getElementById('profile-description').value = company.description;

  servicesEditor.innerHTML = '';
  company.prices.services.forEach(addServiceRow);
  extrasEditor.innerHTML = '';
  company.prices.extras.forEach(addExtraRow);

  frequenciesEditor.innerHTML = '';
  frequencyNames = company.prices.frequencies.map((f) => ({ id: f.id, name: f.name }));
  company.prices.frequencies.forEach((frequency) => {
    const percent = Math.round(frequency.discount * 1000) / 10; // 0.15 -> 15
    const box = field(`${frequency.name} (%)`, 'number', percent, '');
    box.querySelector('input').max = '50';
    frequenciesEditor.appendChild(box);
  });
}

// Reads the editor back into a price list. Empty boxes become NaN, and the
// server answers with a clear message about which one is wrong.
function readPrices() {
  const rowValues = (list) => Array.from(list.children).map((row) =>
    Array.from(row.querySelectorAll('input')).map((input) => input.value));
  return {
    services: rowValues(servicesEditor).map(([name, base, perRoom]) => ({
      name: name, basePrice: toNumber(base), pricePerRoom: toNumber(perRoom)
    })),
    frequencies: Array.from(frequenciesEditor.querySelectorAll('input')).map((input, i) => ({
      id: frequencyNames[i].id, discount: toNumber(input.value) / 100 // 15 -> 0.15
    })),
    extras: rowValues(extrasEditor).map(([name, price]) => ({ name: name, price: toNumber(price) }))
  };
}

// "12.5" -> 12.5; an empty box becomes NaN (the server then explains what's wrong)
function toNumber(text) {
  const cleaned = String(text).trim();
  return cleaned === '' ? NaN : Number(cleaned);
}

document.getElementById('add-service').addEventListener('click', () => {
  addServiceRow({});
  servicesEditor.lastElementChild.querySelector('input').focus();
});
document.getElementById('add-extra').addEventListener('click', () => {
  addExtraRow({});
  extrasEditor.lastElementChild.querySelector('input').focus();
});

document.getElementById('profile-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const saveButton = document.getElementById('save-button');
  const saveMessage = document.getElementById('save-message');
  saveButton.disabled = true;
  saveButton.textContent = 'Saving…';

  const result = await api('/api/my/company', {
    method: 'PUT',
    body: {
      name: document.getElementById('profile-name').value,
      city: document.getElementById('profile-city').value,
      description: document.getElementById('profile-description').value,
      prices: readPrices()
    }
  });

  saveButton.disabled = false;
  saveButton.textContent = 'Save changes';
  saveMessage.hidden = false;
  if (result.ok) {
    fillProfile(result.data); // show the cleaned-up version the server saved
    saveMessage.className = 'request-message success-message';
    saveMessage.textContent = 'Saved! Customers now see your new prices.';
  } else {
    saveMessage.className = 'request-message error-message';
    saveMessage.textContent = result.data.error || 'Sorry, we could not save your changes.';
  }
});

// ---------- 3. Requests table (both kinds of account) ----------
async function loadRequests(role) {
  const result = await api('/api/my/requests');
  const count = document.getElementById('requests-count');
  document.getElementById('requests-area').hidden = false;
  if (!result.ok) {
    count.textContent = result.data.error || 'Sorry, we could not load the requests.';
    return;
  }

  const requests = result.data;
  const isCompany = role === 'company';
  document.getElementById('requests-title').textContent = isCompany ? 'Requests from customers' : 'My quote requests';
  if (requests.length === 0) {
    count.textContent = isCompany
      ? 'No requests yet. They appear here when customers send them.'
      : 'You haven\'t sent any requests yet. Find a company and press "Send request".';
    return;
  }
  count.textContent = `${requests.length} request(s), newest first.`;

  const headings = isCompany
    ? ['#', 'Date', 'Customer', 'Email', 'Service', 'Rooms', 'How often', 'Extras', 'Total']
    : ['#', 'Date', 'Company', 'Service', 'Rooms', 'How often', 'Extras', 'Total'];
  const head = document.getElementById('requests-head');
  head.innerHTML = '';
  headings.forEach((text) => {
    const th = el('th', '', text);
    th.scope = 'col';
    head.appendChild(th);
  });

  const body = document.getElementById('requests-body');
  body.innerHTML = '';
  requests.forEach((request) => {
    const row = document.createElement('tr');
    const addCell = (content) => {
      const cell = document.createElement('td');
      cell.append(content); // text or a link element
      row.appendChild(cell);
    };
    addCell(String(request.id));
    addCell(formatDate(request.createdAt));
    if (isCompany) {
      addCell(request.customerName);
      const mail = el('a', '', request.customerEmail);
      mail.href = `mailto:${request.customerEmail}`;
      addCell(mail);
    } else {
      const link = el('a', '', request.companyName);
      link.href = `/company.html?c=${encodeURIComponent(request.companySlug)}`;
      addCell(link);
    }
    addCell(request.service);
    addCell(String(request.rooms));
    addCell(request.frequency);
    addCell(request.extras.length > 0 ? request.extras.join(', ') : '–');
    addCell(formatMoney(request.total));
    body.appendChild(row);
  });
  document.getElementById('requests-wrapper').hidden = false;
}

// ---------- 4. Start ----------
// Messages from the address: ?welcome=1, ?checkout=success&session_id=..., ?checkout=canceled
async function handleAddress() {
  const params = new URLSearchParams(window.location.search);
  const checkout = params.get('checkout');
  let company = null;

  if (params.get('welcome')) {
    showPageMessage('Your account is ready! One more step: pay the monthly fee below so customers can find you.');
  }
  if (checkout === 'canceled') {
    showPageMessage('The payment was cancelled. Nothing was charged. You can try again any time.');
  }
  if (checkout === 'demo') {
    showPageMessage('Demo payment done: your company is now live. (No real payment was made.)');
  }
  if (checkout === 'success') {
    showPageMessage('Checking your payment…');
    // Ask our server to check with Stripe that the payment really went through
    const result = await api('/api/billing/confirm', { method: 'POST', body: { sessionId: params.get('session_id') } });
    if (result.ok && result.data.isLive) {
      showPageMessage('Payment received, thank you! Your company is now live.');
      company = result.data;
    } else {
      showPageMessage('We are still waiting for Stripe to confirm your payment. Refresh this page in a minute.');
    }
  }
  // Clean the address, so refreshing the page doesn't show the message again
  if (params.toString()) {
    history.replaceState(null, '', '/dashboard.html');
  }
  return company;
}

async function start() {
  const me = await currentUser;
  if (!me.user) {
    // Not logged in: go to the login page, and come back here afterwards
    window.location.href = '/login.html?next=' + encodeURIComponent('/dashboard.html');
    return;
  }
  document.getElementById('hello').textContent = `Hello, ${me.user.name}`;

  if (me.user.role === 'company') {
    let company = await handleAddress();
    if (!company) {
      const result = await api('/api/my/company');
      if (!result.ok) {
        showPageMessage(result.data.error || 'Sorry, we could not load your company.');
        return;
      }
      company = result.data;
    }
    document.getElementById('company-area').hidden = false;
    showSubscription(company);
    fillProfile(company);
  }
  loadRequests(me.user.role);
}

start();
