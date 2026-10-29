# QuickQuote — Project Plan, Backlog & Hourly Schedule

> **Update:** in Task 15 the hosting changed from Render to **Vercel**, and in Task 16 QuickQuote became a
> marketplace with company and customer accounts (see README.md and LEARNING_NOTES.md). This plan is kept as
> the original record of the first 15 tasks.

## Context
You need a student website, **QuickQuote**: a service price calculator built in 15 small steps,
one step per hour, each building on the last and saved. It has to be beginner-friendly, responsive,
publishable, and it has a **real backend** (you chose this). The working folder is empty right now.

This cloud container is **temporary**, so files left only here can vanish between hours.
"Save its changes" therefore means **commit + push to GitHub** after every task. GitHub is the
real save point, and the hosting service deploys from it.

---

## 1. Project Idea
**QuickQuote: instant price estimates for "Sparkle Home Cleaning"** (a made-up local business).

A visitor fills in a short form and gets a price from the **server**, with a breakdown.
They can then send a quote request, which the server saves. The business owner sees the saved
requests on a password-protected admin page.

- **Service type:** Standard clean, Deep clean, Move-out clean (each has a base price)
- **Number of rooms:** 1–10 (price per room)
- **Frequency:** One-time, Monthly (−5%), Bi-weekly (−10%), Weekly (−15%)
- **Extras:** Inside windows, Inside fridge, Inside oven, Laundry
- **Currency:** Euro (€)

### Tech stack (as simple as a real backend can be)
| Part | Tool | Why |
|------|------|-----|
| Frontend | Plain HTML + CSS + JavaScript | No framework to learn |
| Backend | **Node.js 22 + Express 5** | The most common beginner backend, and it's JavaScript like the frontend |
| Storage | A JSON file (`data/requests.json`) | Works like a tiny database, with nothing to install |
| Talking between them | `fetch()` calling a small JSON API | Teaches how frontends and backends talk to each other |
| Hosting | **Render** (free web service, deploys from GitHub) | Runs a real Node server. GitHub Pages can't. |

### API (the backend's "menu")
| Method & URL | What it does |
|---|---|
| `GET /api/services` | Returns the price list as JSON (the form is built from it) |
| `POST /api/quote` | Checks the input, calculates the price **on the server**, returns the breakdown + total |
| `POST /api/requests` | Saves a quote request (name, email, quote) to `data/requests.json` |
| `GET /api/requests` | Returns the saved requests. Needs the admin password (`ADMIN_PASSWORD` environment variable). |

### Final file structure
```
quickquote/
├── package.json         ← project info, "npm start" script, Express dependency
├── server.js            ← Express server: serves public/ + the API routes
├── prices.js            ← price list + calculateQuote() (the business logic)
├── data/requests.json   ← saved requests (created automatically, not committed)
├── public/
│   ├── index.html       ← main page
│   ├── admin.html       ← saved requests (password protected)
│   ├── css/style.css
│   └── js/script.js     ← frontend logic, talks to the API with fetch()
├── .gitignore           ← node_modules/, data/requests.json
├── BACKLOG.md           ← the 15 tasks with [ ] / [x] checkboxes (progress tracker)
├── LEARNING_NOTES.md    ← a short plain-English note for each task: what changed and why
└── README.md            ← description, how to run, API, live link (for your professor)
```

---

## 2. Product Backlog (15 tasks, in order)
Every task ends the same way: tick its box in `BACKLOG.md`, add a note to `LEARNING_NOTES.md`,
`git commit -m "Task N: …"`, `git push`.

| # | Task | Done when… |
|---|------|-----------|
| 1 | **Project setup**: `npm init`, install Express, `.gitignore`, folders, `BACKLOG.md`, `README.md` stub, `LEARNING_NOTES.md` | `npm install` works; first commit pushed |
| 2 | **First server**: `server.js` serves `public/`; `npm start` script; uses `process.env.PORT \|\| 3000` | `http://localhost:3000` shows "Hello QuickQuote" |
| 3 | **Page structure**: viewport meta, title, semantic header/nav, hero (headline + "Get my quote" button that jumps to `#calculator`), empty calculator section, footer | All sections visible; button jumps to the calculator |
| 4 | **Base CSS**: CSS variables (colors, spacing), reset, fonts, `.container`, header/hero/footer styling | Page looks clean and branded |
| 5 | **API: price list**: prices in `prices.js`, `GET /api/services` returns them as JSON | Opening `/api/services` in the browser shows the JSON |
| 6 | **Calculator form**: form HTML; JS `fetch`es `/api/services` and fills in the service options, frequencies and extras | Form shows options that come from the server |
| 7 | **Form styling + responsive layout**: inputs, buttons, focus states, result card; mobile-first; form and result side by side on wide screens | Looks good at 375px, 768px and 1280px; no sideways scroll |
| 8 | **API: calculate**: `calculateQuote()` in `prices.js`; `POST /api/quote` returns the breakdown + total | `curl` tests match hand-worked examples |
| 9 | **Connect form to API**: Calculate sends a `fetch` POST; shows the itemized breakdown + total in € (`Intl.NumberFormat`) | Clicking Calculate shows the server's price |
| 10 | **Validation & errors**: server returns 400 + a clear message for bad input (rooms must be 1–10, unknown service); frontend shows friendly errors, a "Calculating…" state, and a "server unreachable" message | Bad input never shows `NaN` or crashes the server |
| 11 | **Live updates + Reset**: recalculate whenever an input changes; Reset clears the form and the result | Price updates as you click |
| 12 | **Save requests**: "Request this quote" form (name, email) → `POST /api/requests` → appended to `data/requests.json` with the date; success message | A request appears in the JSON file |
| 13 | **Admin page**: `admin.html` asks for the password and calls `GET /api/requests` (password sent in a header, checked against `ADMIN_PASSWORD`); shows the requests in a table | Wrong password → "Access denied"; right password → table |
| 14 | **Accessibility & polish**: `aria-live` on the result, visible focus, color contrast, meta description, favicon, small transitions | Keyboard-only use works; Lighthouse accessibility ≥ 90 |
| 15 | **Final test, README & deploy**: test everything; full README (what it is, how to run, API table, how it works, limitations); deploy to Render | Live URL works end to end; submission checklist done |

---

## 3. Scheduling Approach (each task runs once, in order, one hour apart)

**Method: 15 separate one-time scheduled tasks, not one repeating task.**

- I create 15 scheduled tasks with fixed times: Task 1 at start time **T** (about 10 minutes after
  setup), Task 2 at T+1h … Task 15 at T+14h.
- Each scheduled task has **its own message** that names only its task, for example:
  *"Run QuickQuote Task 8: API calculate … then tick it in BACKLOG.md, commit, push."*
- A one-time scheduled task **switches itself off after it fires**, so each task runs exactly once.
  Nothing repeats every hour.
- They all fire into **this same session**, so I keep the full plan in context.
- If a task is still running when the next one is due, the next one **waits** until it finishes,
  so the order holds.

**Safety check at the start of every task** (written into each message):
1. Pull the latest code from GitHub and run `npm install`.
2. Open `BACKLOG.md`. If Task N is already ticked, stop (no duplicates).
3. If an earlier task isn't ticked, finish that one first, then Task N (keeps the order).
4. Do Task N, test it, tick it, write the learning note, commit "Task N: …", push.

### Instructions text for each scheduled task (copy-paste, change N + title)
Written to work on its own, even in a fresh session that doesn't remember this chat:
```
Project: QuickQuote, GitHub repo onurshaqiridev-maker/quickquote, branch main.
This run: do Task N "<TITLE>" only.

1. Pull the latest main. Read PLAN.md and BACKLOG.md.
2. If Task N is already ticked [x] in BACKLOG.md, stop and reply "Task N already done".
3. If an earlier task is not ticked, finish it first (in order), then do Task N.
4. Build Task N exactly as PLAN.md describes; its "Done when" column is the finish line.
   Keep it beginner-friendly: plain HTML/CSS/JS frontend, Node.js + Express backend,
   short clear comments, no extra libraries.
5. Test: npm install, npm start, check the page in Chromium at 375px and 1280px wide,
   check the console for errors, curl any API routes.
6. Tick Task N in BACKLOG.md. Add a short plain-English note to LEARNING_NOTES.md
   (what changed, why, what I learned).
7. Commit "Task N: <TITLE>" and push to main.
8. Reply with a 3-5 line summary and what I should check.
```
Fallback if a scheduler only offers repeating schedules: ONE hourly task whose text says
"do the first unticked task in BACKLOG.md only", and "if all 15 are ticked, reply
'QuickQuote complete, disable this scheduled task'".

**Why not one repeating hourly task?** It would send the *same* message every hour, has to be
stopped by hand after Task 15, and could repeat or skip a step.

**How to follow along:** each hour a new commit appears on GitHub ("Task 1: …", "Task 2: …") and
another box gets ticked in `BACKLOG.md`. You can see or cancel the scheduled tasks in your
claude.ai scheduled-tasks list, or ask me to list or cancel them.

---

## 4. Decisions made
- **Backend:** Node.js 22 + Express 5 with a JSON file for storage. I checked that Node 22 and
  Express 5.3.0 are available here.
- **Repo:** a new empty public repo `onurshaqiridev-maker/quickquote`. **You create it on GitHub first**
  (github.com → New repository → name `quickquote`, Public, no template), then tell me "repo ready".
- **Start:** Task 1 about 10 minutes after the schedule is set up; Task 15 about 14 hours later.
- **Currency:** Euro (€).
- **Hosting:** Render free web service.

## 5. Right after you approve (Hour 0: setup only, no website code)
1. When the repo exists: connect it with push access (`add_repo`) and clone it into `/home/user/quickquote`.
   Push `PLAN.md` (this plan) and `BACKLOG.md` (15 unticked boxes) as the first commit, so every
   scheduled task can read them, even in a fresh session.
2. Create the 15 one-time scheduled tasks (`create_trigger` with `run_once_at`, firing into this
   session): T = now + 10 min, then T+1h … T+14h, each with its own Task N message and the safety check.
3. Show you the list with the exact times so you can confirm.

## 6. Publishing & Submission (Task 15)
- **Render** (render.com, free): you sign up with GitHub (I can't create the account for you), then
  New → Web Service → pick `quickquote` → Build: `npm install`, Start: `npm start` → add the
  environment variable `ADMIN_PASSWORD`. Render redeploys on every push. Live URL looks like
  `https://quickquote-xxxx.onrender.com`. I'll walk you through each click.
- **Free-tier limits, written into the README's "Limitations & next steps":**
  - The server sleeps after about 15 minutes with no visitors, so the first visit after that can take ~30–60 s.
  - Saved requests in the JSON file are wiped when Render restarts or redeploys. The next step
    would be a real database.
  - Open the site once before you demo it.
- **Submit:** the live link + the GitHub repo link. The commit history shows the 15 steps, and
  `LEARNING_NOTES.md` explains each one.

## 7. Verification
- Every task: start the server (`npm start`) in the container, open it in the pre-installed
  Chromium (Playwright) at phone and desktop widths, take screenshots, check the console for errors.
- API tasks (5, 8, 10, 12, 13): `curl` each endpoint with good and bad input and check status codes and JSON.
- Price math: check totals against hand-worked examples, written into `LEARNING_NOTES.md`.
- Task 14: Lighthouse accessibility check.
- Task 15: open the live Render URL and go through calculate → request → admin.
