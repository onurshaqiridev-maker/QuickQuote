// QuickQuote log in page
// Uses api() and safeNext() from common.js.

const loginForm = document.getElementById('login-form');
const loginButton = document.getElementById('login-button');
const loginMessage = document.getElementById('login-message');

// Keep ?next=... when switching to the sign up page
const next = safeNext('');
if (next) {
  document.getElementById('signup-link').href = `/signup.html?next=${encodeURIComponent(next)}`;
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  loginMessage.hidden = true;

  const email = loginForm.email.value.trim();
  const password = loginForm.password.value;
  if (email === '' || password === '') {
    loginMessage.textContent = 'Please enter your email and password.';
    loginMessage.hidden = false;
    return;
  }

  loginButton.disabled = true;
  loginButton.textContent = 'Logging in…';
  const result = await api('/api/auth/login', { method: 'POST', body: { email: email, password: password } });
  loginButton.disabled = false;
  loginButton.textContent = 'Log in';

  if (!result.ok) {
    loginMessage.textContent = result.data.error || 'Sorry, we could not log you in.';
    loginMessage.hidden = false;
    loginForm.password.select();
    return;
  }
  // Back to the page they came from, or the dashboard
  window.location.href = safeNext('/dashboard.html');
});
