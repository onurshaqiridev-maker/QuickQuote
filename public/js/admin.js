// QuickQuote admin page
// Asks for the admin password, then loads the saved quote requests from the
// server (GET /api/requests) and shows them in a table.

// ---------- 1. Find the HTML elements we need ----------
const loginForm = document.getElementById('login-form');
const passwordInput = document.getElementById('admin-password');
const loginButton = document.getElementById('login-button');
const adminMessage = document.getElementById('admin-message');
const requestsSection = document.getElementById('requests-section');
const requestsCount = document.getElementById('requests-count');
const requestsBody = document.getElementById('requests-body');

// ---------- 2. Helpers ----------
function formatMoney(amount) {
  return new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(amount);
}

// "2026-10-29T07:30:00.000Z" -> "29 Oct 2026, 08:30" (in the viewer's own time zone)
function formatDate(isoText) {
  return new Date(isoText).toLocaleString('en-IE', { dateStyle: 'medium', timeStyle: 'short' });
}

function showMessage(text) {
  adminMessage.textContent = text;
  adminMessage.hidden = false;
}

// ---------- 3. Build one table row ----------
// textContent is used for every cell: customer names and emails are typed by
// visitors, so they are shown as plain text and can never run as code.
function addRow(request) {
  const row = document.createElement('tr');
  const cells = [
    request.id,
    formatDate(request.createdAt),
    request.name,
    request.email,
    request.service,
    request.rooms,
    request.frequency,
    request.extras.length > 0 ? request.extras.join(', ') : '–',
    formatMoney(request.total)
  ];

  cells.forEach((value) => {
    const cell = document.createElement('td');
    cell.textContent = value;
    row.appendChild(cell);
  });
  requestsBody.appendChild(row);
}

// ---------- 4. Load the requests when the password is sent ----------
loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  adminMessage.hidden = true;

  if (passwordInput.value === '') {
    showMessage('Please enter the admin password.');
    passwordInput.focus();
    return;
  }

  loginButton.disabled = true;
  loginButton.textContent = 'Loading…';

  try {
    const response = await fetch('/api/requests', {
      // The password travels in a header, not in the address bar
      headers: { 'x-admin-password': passwordInput.value }
    });
    const data = await response.json();

    if (!response.ok) {
      // 401 = wrong password, 503 = no password set on the server
      requestsSection.hidden = true;
      showMessage(data.error || 'Access denied.');
      passwordInput.select();
      return;
    }

    // Right password: fill in the table (clear old rows first)
    requestsBody.innerHTML = '';
    data.forEach(addRow);
    requestsCount.textContent = data.length === 0
      ? 'No requests yet.'
      : `${data.length} request(s), newest first. Press "Show requests" again to refresh.`;
    requestsSection.hidden = false;
  } catch (error) {
    console.error('Could not load requests:', error);
    showMessage("We can't reach the server right now. Please try again.");
  } finally {
    loginButton.disabled = false;
    loginButton.textContent = 'Show requests';
  }
});
