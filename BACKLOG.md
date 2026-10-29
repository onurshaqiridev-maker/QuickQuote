# QuickQuote — Product Backlog

One task per hour, in this order. Each task builds on the one before it.
When a task is finished: tick its box (`[ ]` → `[x]`), add a note to `LEARNING_NOTES.md`,
commit `Task N: <title>`, and push.

Full details for every task are in [PLAN.md](PLAN.md).

- [x] **Task 1 — Project setup:** `npm init`, install Express, `.gitignore`, folders, `README.md` stub, `LEARNING_NOTES.md`
  - Done when: `npm install` works; first commit pushed
- [x] **Task 2 — First server:** `server.js` serves `public/`; `npm start` script; uses `process.env.PORT || 3000`
  - Done when: `http://localhost:3000` shows "Hello QuickQuote"
- [x] **Task 3 — Page structure:** viewport meta, title, header/nav, hero with "Get my quote" button to `#calculator`, empty calculator section, footer
  - Done when: all sections visible; button jumps to the calculator
- [x] **Task 4 — Base CSS:** CSS variables, reset, fonts, `.container`, header/hero/footer styling
  - Done when: page looks clean and branded
- [x] **Task 5 — API: price list:** prices in `prices.js`, `GET /api/services` returns them as JSON
  - Done when: `/api/services` shows the JSON in the browser
- [x] **Task 6 — Calculator form:** form HTML; JS `fetch`es `/api/services` and fills in the options
  - Done when: the form shows options that come from the server
- [x] **Task 7 — Form styling + responsive layout:** inputs, buttons, focus states, result card; mobile-first; side by side on wide screens
  - Done when: looks good at 375px, 768px and 1280px; no sideways scroll
- [x] **Task 8 — API: calculate:** `calculateQuote()` in `prices.js`; `POST /api/quote` returns breakdown + total
  - Done when: `curl` tests match hand-worked examples
- [x] **Task 9 — Connect form to API:** Calculate sends a `fetch` POST; shows itemized breakdown + total in €
  - Done when: clicking Calculate shows the server's price
- [x] **Task 10 — Validation & errors:** server returns 400 + clear message for bad input; frontend shows friendly errors, "Calculating…" state, "server unreachable" message
  - Done when: bad input never shows `NaN` or crashes the server
- [x] **Task 11 — Live updates + Reset:** recalculate on every input change; Reset clears form and result
  - Done when: the price updates as you click
- [ ] **Task 12 — Save requests:** "Request this quote" form (name, email) → `POST /api/requests` → saved to `data/requests.json`
  - Done when: a request appears in the JSON file
- [ ] **Task 13 — Admin page:** `admin.html` asks for the password, calls `GET /api/requests`, shows a table
  - Done when: wrong password → "Access denied"; right password → table
- [ ] **Task 14 — Accessibility & polish:** `aria-live` result, visible focus, contrast, meta description, favicon, small transitions
  - Done when: keyboard-only use works; Lighthouse accessibility ≥ 90
- [ ] **Task 15 — Final test, README & deploy:** test everything; full README; deploy to Render
  - Done when: live URL works end to end; submission checklist done
