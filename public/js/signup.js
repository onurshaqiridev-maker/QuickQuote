// QuickQuote sign up page
// Uses api() and safeNext() from common.js.

const signupForm = document.getElementById('signup-form');
const companyFields = document.getElementById('company-fields');
const companyNote = document.getElementById('company-note');
const signupButton = document.getElementById('signup-button');
const signupMessage = document.getElementById('signup-message');

// Which kind of account is chosen? 'customer' or 'company'
function chosenRole() {
  return signupForm.querySelector('input[name="role"]:checked').value;
}

// Show the company name + city boxes only for company accounts
function updateFields() {
  const isCompany = chosenRole() === 'company';
  companyFields.hidden = !isCompany;
  companyNote.hidden = !isCompany;
  signupButton.textContent = isCompany ? 'Create account and continue to payment' : 'Create account';
}

// ?role=company in the address picks "company" (from the "List my company" button)
const roleFromAddress = new URLSearchParams(window.location.search).get('role');
if (roleFromAddress === 'company') {
  signupForm.querySelector('input[value="company"]').checked = true;
}
updateFields();
signupForm.addEventListener('change', updateFields);

// Keep ?next=... when switching to the login page
const loginLink = document.getElementById('login-link');
const next = safeNext('');
if (next) {
  loginLink.href = `/login.html?next=${encodeURIComponent(next)}`;
}

function showMessage(text) {
  signupMessage.textContent = text;
  signupMessage.hidden = false;
}

signupForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  signupMessage.hidden = true;

  // (We use getElementById: "signupForm.name" would give the form's own name, not the input)
  const value = (id) => document.getElementById(id).value;
  const role = chosenRole();
  const data = {
    role: role,
    name: value('name').trim(),
    email: value('email').trim(),
    password: value('password')
  };
  if (role === 'company') {
    data.companyName = value('company-name').trim();
    data.city = value('company-city').trim();
  }

  // Quick checks here; the server checks everything again
  if (data.password.length < 8) {
    showMessage('Your password needs at least 8 characters.');
    document.getElementById('password').focus();
    return;
  }

  signupButton.disabled = true;
  const result = await api('/api/auth/signup', { method: 'POST', body: data });
  signupButton.disabled = false;

  if (!result.ok) {
    showMessage(result.data.error || 'Sorry, we could not create your account.');
    return;
  }

  // Companies go to their dashboard to pay; customers go back where they were
  if (role === 'company') {
    window.location.href = '/dashboard.html?welcome=1';
  } else {
    window.location.href = safeNext('/dashboard.html');
  }
});
