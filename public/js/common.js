// QuickQuote: helpers that every page uses.
// This file is loaded BEFORE each page's own script, so those scripts can use
// api(), formatMoney(), el(), safeNext() and the "currentUser" promise.

// ---------- 1. Talk to the server ----------
// api('/api/companies') or api('/api/auth/login', { method: 'POST', body: {...} })
// Always answers { ok, status, data } and never throws, so pages stay simple.
// If the server can't be reached at all: { ok: false, status: 0, data: { error } }
async function api(url, options = {}) {
  const settings = { method: options.method || 'GET', headers: {} };
  if (options.body !== undefined) {
    settings.headers['Content-Type'] = 'application/json';
    settings.body = JSON.stringify(options.body); // object -> JSON text
  }
  try {
    const response = await fetch(url, settings);
    const data = await response.json();
    return { ok: response.ok, status: response.status, data: data };
  } catch (error) {
    console.error('Could not reach the server:', error);
    return {
      ok: false,
      status: 0,
      data: { error: "We can't reach our server right now. Please check your internet connection and try again." }
    };
  }
}

// ---------- 2. Money: 40 -> "€40.00" (made once, reused) ----------
const moneyFormat = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' });
const shortMoneyFormat = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 });

function formatMoney(amount) {
  return moneyFormat.format(amount);
}

// Shorter for labels: 40 -> "€40", but 12.5 -> "€12.50" (cents are kept when there are any)
function formatShortMoney(amount) {
  return Number.isInteger(amount) ? shortMoneyFormat.format(amount) : moneyFormat.format(amount);
}

// "2026-10-29T07:30:00.000Z" -> "29 Oct 2026, 08:30" (in the viewer's time zone)
function formatDate(isoText) {
  return new Date(isoText).toLocaleString('en-IE', { dateStyle: 'medium', timeStyle: 'short' });
}

// ---------- 3. Make an element: el('p', 'intro', 'Hello') ----------
// textContent is used, never innerHTML, so text typed by visitors can never run as code.
function el(tag, className, text) {
  const element = document.createElement(tag);
  if (className) {
    element.className = className;
  }
  if (text !== undefined) {
    element.textContent = text;
  }
  return element;
}

// ---------- 4. The "?next=" address after logging in ----------
// Only addresses on our own site ("/company.html?c=..."), never another website
function safeNext(fallback) {
  const next = new URLSearchParams(window.location.search).get('next');
  if (next && next.startsWith('/') && !next.startsWith('//')) {
    return next;
  }
  return fallback;
}

// ---------- 5. The menu changes when you are logged in ----------
// currentUser is a promise: pages can do "const me = await currentUser;"
const currentUser = (async () => {
  const result = await api('/api/auth/me');
  return result.ok ? result.data : { user: null };
})();

async function updateMenu() {
  const menu = document.getElementById('account-menu');
  if (!menu) {
    return;
  }
  const me = await currentUser;
  menu.innerHTML = '';

  if (me.user) {
    const dashboard = el('a', '', 'My account');
    dashboard.href = '/dashboard.html';
    const logout = el('button', 'link-button', 'Log out');
    logout.type = 'button';
    logout.addEventListener('click', async () => {
      await api('/api/auth/logout', { method: 'POST' });
      window.location.href = '/';
    });
    menu.append(wrap(dashboard), wrap(logout));
  } else {
    const login = el('a', '', 'Log in');
    login.href = '/login.html';
    const signup = el('a', 'nav-button', 'Sign up');
    signup.href = '/signup.html';
    menu.append(wrap(login), wrap(signup));
  }
}

function wrap(child) {
  const item = document.createElement('li');
  item.appendChild(child);
  return item;
}

updateMenu();
