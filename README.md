# QuickQuote

**A cleaning marketplace.** Cleaning companies pay **€9/month** to be listed. Customers search the companies,
see each company's real prices, get an instant quote and send a quote request.
A student project: a responsive website with a Node.js + Express backend, a database and Stripe payments.

🔗 **Live site:** https://quick-quote-nu.vercel.app
📁 **Code:** https://github.com/onurshaqiridev-maker/QuickQuote

---

## What it does

**Customers** (free account)
1. Search companies by name, city or description on the home page.
2. Open a company and use its price calculator. The price updates live, with a full breakdown.
3. Sign up or log in, then send the quote request with one click.
4. See all their requests under **My account**.

**Companies** (€9/month)
1. Sign up as a company (company name + city), then pay with **Stripe** (test mode: no real money).
2. As soon as the payment goes through, the company appears in the search.
3. Set their own services, prices per room, discounts and extras in the dashboard.
4. See the requests customers sent them, with the customer's name and email.
5. If they cancel or a payment fails, Stripe tells the server and the company is hidden again.

## Tech

| Part | Tool |
|------|------|
| Frontend | HTML, CSS, JavaScript (no frameworks) |
| Backend | Node.js 22.5+ and Express 5 |
| Database | SQLite (built into Node) on your computer; PostgreSQL online (`DATABASE_URL`) |
| Accounts | Passwords hashed with `scrypt`, login sessions in a secure cookie (built-in `crypto`) |
| Payments | Stripe Checkout (monthly subscription), called with `fetch`, plus webhooks |
| Hosting | Vercel (free Hobby plan) |

## Run it on your computer

1. Install [Node.js](https://nodejs.org) **version 22.5 or newer** (`node -v` shows your version).
2. Open a terminal in the project folder and install the packages:
   ```
   npm install
   ```
3. Add the demo companies and a demo customer (only once):
   ```
   npm run seed
   ```
4. Start the server. Pick **one**:
   - **Demo payments** (no Stripe account needed; "Pay" just switches the company on):
     - Mac / Linux: `DEMO_PAYMENTS=true npm start`
     - Windows (PowerShell): `$env:DEMO_PAYMENTS="true"; npm start`
   - **Stripe test mode**: see [Set up Stripe](#set-up-stripe-test-mode) below.
5. Open **http://localhost:3000**. Stop the server with `Ctrl + C`.

The data is saved in `data/quickquote.db` (not on GitHub). Delete that file to start again.

**Demo accounts** (all use the password `demo-password`):
`customer@demo.quickquote` (customer), `sparkle@demo.quickquote`, `fresh@demo.quickquote`, `shine@demo.quickquote` (companies).

## Set up Stripe (test mode)

1. Create a free account at [stripe.com](https://stripe.com). Stay in **Test mode** (the switch at the top).
2. **Developers → API keys**: copy the **Secret key** (`sk_test_...`).
3. Start the server with it:
   ```
   STRIPE_SECRET_KEY=sk_test_... npm start
   ```
4. Sign up as a company and press **Pay €9/month**. On Stripe's page use the test card
   **4242 4242 4242 4242**, any future date, any 3 digits.
5. Stripe sends you back to the dashboard, and the server checks the payment with Stripe. Your company is live.

**For cancelling and failed payments (webhooks):**
- **Online:** Stripe → **Developers → Webhooks → Add endpoint**. URL: `https://<your-site>/api/billing/webhook`.
  Events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`,
  `customer.subscription.deleted`. Copy the **Signing secret** (`whsec_...`) into `STRIPE_WEBHOOK_SECRET`.
- **"Manage subscription" button:** in Stripe test mode, open **Settings → Billing → Customer portal** once and press **Save**.

## Put it online (Vercel)

Vercel's computers forget files, so online the site needs a real database:

1. In your Vercel project: **Storage → Create Database → Neon (Postgres)** (free) and connect it to the project.
   Vercel adds `DATABASE_URL` for you.
2. **Settings → Environment Variables**: add `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`.
   (You can delete the old `ADMIN_PASSWORD`; it isn't used any more.)
3. Push to GitHub. Vercel redeploys automatically. The tables are created on the first visit.
4. Optional, demo companies online: run `npm run seed` on your computer with `DATABASE_URL` set to the same
   connection string.

## Project structure

```
QuickQuote/
├── server.js            ← starts Express, connects all the routes
├── db.js                ← query(): SQLite on your computer, PostgreSQL online
├── auth.js              ← password hashing, login sessions, requireUser()
├── billing.js           ← Stripe: checkout, subscriptions, webhook signature check
├── prices.js            ← default prices, price list checks, the price calculation
├── seed.js              ← demo companies and a demo customer (npm run seed)
├── routes/
│   ├── auth.js          ← /api/auth: sign up, log in, log out, me
│   ├── companies.js     ← /api/companies: list, search, prices, quote, send request
│   └── account.js       ← /api/my and /api/billing: dashboard and payments
└── public/              ← everything the browser downloads
    ├── index.html       ← home: search + company list + "for companies"
    ├── company.html     ← one company's price calculator
    ├── signup.html, login.html
    ├── dashboard.html   ← "My account" for customers and companies
    ├── css/style.css
    └── js/              ← common.js (shared helpers) + one file per page
```

## API

| Method & URL | Who | What it does |
|---|---|---|
| `POST /api/auth/signup` | anyone | Create a customer or company account (and log in) |
| `POST /api/auth/login` · `POST /api/auth/logout` | anyone | Log in / out (session cookie) |
| `GET /api/auth/me` | anyone | Who is logged in |
| `GET /api/companies?search=…` | anyone | Paid companies only, searched by name, city, description |
| `GET /api/companies/:slug` | anyone | One company with its price list |
| `POST /api/companies/:slug/quote` | anyone | Calculate a price with that company's prices |
| `POST /api/companies/:slug/requests` | customer | Send a quote request (price calculated on the server) |
| `GET /api/my/requests` | logged in | A customer's sent requests, or a company's received requests |
| `GET /api/my/company` · `PUT /api/my/company` | company | Read / save profile and prices |
| `POST /api/billing/checkout` | company | Get a Stripe payment page address |
| `POST /api/billing/confirm` | company | Check with Stripe that the payment went through |
| `POST /api/billing/portal` | company | Stripe page to change the card or cancel |
| `POST /api/billing/webhook` | Stripe | Signed messages about payments and cancellations |

## How the price is calculated

```
subtotal = base price + (rooms × price per room) + extras
total    = subtotal − (subtotal × frequency discount)
```

Every company sets its own numbers. Example with the default prices: Deep clean, 3 rooms, weekly, inside oven
→ 70 + 3×25 + 25 = **€170**, minus 15% (€25.50) = **€144.50**.

## Security, in plain words

- Passwords are never saved, only a salted `scrypt` hash.
- The login cookie is `HttpOnly` (page scripts can't read it), `SameSite=Lax` (other sites can't use it) and `Secure` online.
- Prices are always calculated on the server; a price sent by the browser is ignored.
- A company is only shown when **Stripe** says it has paid: the server asks Stripe itself, and checks the signature of every webhook.
- Text typed by visitors is shown with `textContent`, so it can never run as code.

## Testing

- **API:** 91 automated checks (search, quotes, bad input, sign up, log in, roles, price editor, Stripe checkout,
  confirm, webhook signatures, cancel/past-due, demo mode).
- **Browser (Chromium)** at 375px, 768px and 1280px: the full customer flow (search → prices → sign up → send request
  → my requests) and company flow (sign up → pay → edit prices → page shows new prices → see requests).
  No sideways scrolling on any page.
- Stripe was tested against a fake Stripe server, and PostgreSQL was not tested here: please check both once with
  your own Stripe test key and database (see "Set up Stripe").

## Limitations & next steps

| Limitation | Next step |
|---|---|
| No "forgot password" and no email confirmation | Send emails (password reset, new request alerts) |
| No limit on login attempts | Rate limiting |
| Companies can't upload a logo or photos | File uploads |
| Requests have no status (new / done) | Let companies mark and answer requests |
| The demo accounts share a public password | Don't run `npm run seed` on a real site |

---

© 2026 QuickQuote · A student project by onurshaqiridev-maker. The demo companies are made up.
