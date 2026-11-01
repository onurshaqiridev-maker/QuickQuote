# Quick Quote — Project Structure

This document shows **where every piece of code will live**, how files are named, and how to add a new feature without breaking the architecture rules.

> **In simple terms:** A clear folder structure is like labelled drawers. When you need to change "how reservations are saved", you know to open `data/repositories/reservation.repository.ts`, and you never have to search the whole project.

---

## 1. Top level

The repository holds two separate applications, **backend** and **frontend**, plus the documentation.

```
QuickQuote/
├── README.md                 # Project introduction, setup, env vars, diagram, example requests
├── docs/                     # These planning documents (+ images such as the monitor screenshot)
├── docker-compose.yml        # Starts PostgreSQL on your computer for development
├── render.yaml               # Render Blueprint: how the app is deployed (see DEPLOYMENT.md)
├── .gitignore                # Keeps node_modules, .env, build output and uploads out of Git
├── backend/                  # Node.js + Express + TypeScript (API server + email worker)
└── frontend/                 # React + Vite + TypeScript + Tailwind
```

Backend and frontend each have their own `package.json` and are installed separately. This keeps things simple: no "monorepo" tooling is needed.

---

## 2. Backend structure

```
backend/
├── src/
│   ├── server.ts                        # Entry point 1: starts the API server (HTTP)
│   ├── worker.ts                        # Entry point 2: starts the email worker + hourly tasks
│   ├── all.ts                           # Entry point 3 (optional): API + worker in one process, for cheap hosting
│   ├── lifecycle.ts                     # Graceful shutdown on SIGTERM/SIGINT (stops components, closes the pool)
│   │
│   ├── config/                          # Supporting files (not a layer)
│   │   ├── env.ts                       # Reads + validates environment variables with Zod
│   │   └── logger.ts                    # pino logger setup
│   │
│   ├── api/                             # ── LAYER 1: API ──────────────────────────────
│   │   ├── app.ts                       # Builds the Express app: security, JSON, cookies, routes, errors
│   │   ├── http-server.ts               # Starts/stops the HTTP server (used by server.ts and all.ts)
│   │   ├── validation.ts                # parseRequest(): checks input against a Zod schema from models/requests
│   │   ├── responses.ts                 # sendData() / sendPage(): the { data, meta } response shape
│   │   ├── session-cookie.ts            # Sets and clears the qq_session login cookie
│   │   ├── types.d.ts                   # Adds req.user to Express requests
│   │   ├── routes/                      # Which URL goes to which controller (+ middleware)
│   │   │   ├── index.ts
│   │   │   ├── health.routes.ts
│   │   │   ├── auth.routes.ts
│   │   │   ├── account.routes.ts
│   │   │   ├── public.routes.ts
│   │   │   ├── customer.routes.ts
│   │   │   ├── business.routes.ts
│   │   │   └── admin.routes.ts
│   │   ├── controllers/                 # Read request → call service → send response
│   │   │   ├── health.controller.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── account.controller.ts
│   │   │   ├── public/                  # discovery, contact
│   │   │   ├── customer/                # overview, reservation, quote
│   │   │   ├── business/                # overview, profile, offering, schedule, settings,
│   │   │   │                            # reservation, quote, subscription, payment
│   │   │   └── admin/                   # overview, business, user, reservation, quote,
│   │   │                                # subscription, payment, plan, category, email-job
│   │   └── middleware/
│   │       ├── authenticate.ts          # Reads the session cookie → req.user
│   │       ├── require-role.ts          # requireRole('admin')
│   │       ├── require-verified-email.ts
│   │       ├── upload.ts                # Multer: one image in memory, max 5 MB
│   │       ├── load-business.ts         # Finds the logged-in owner's business -> req.businessId
│   │       ├── rate-limit.ts            # express-rate-limit settings
│   │       ├── request-logger.ts        # One log line per request
│   │       ├── error-handler.ts         # Domain error code → HTTP status + JSON error
│   │       └── not-found.ts             # Unknown URL → 404
│   │
│   ├── services/                        # ── LAYER 2: SERVICES (business logic) ────────
│   │   ├── auth.service.ts              # Register, login, email confirmation, password reset
│   │   ├── user.service.ts              # Profile updates, change password, admin user actions
│   │   ├── password.service.ts          # bcrypt hashing and checking
│   │   ├── mappers.ts                   # Entity -> response model (removes private fields)
│   │   ├── seed.service.ts              # Inserts categories, plans and the first admin (used by seeds/seed.ts)
│   │   ├── business.service.ts          # Business status, booking settings, go-live checklist, approval
│   │   ├── profile.service.ts           # Profile content, logo, photos, categories, publish
│   │   ├── category.service.ts          # Public list + admin management
│   │   ├── offering.service.ts          # A business's services and prices (+ plan limits)
│   │   ├── schedule.service.ts          # Working hours + blocked times
│   │   ├── availability.service.ts      # Calculates free time slots
│   │   ├── reservation.service.ts       # Create, confirm, reject, cancel, complete
│   │   ├── quote.service.ts             # Create, start, respond, reject
│   │   ├── discovery.service.ts         # Public search and public profiles
│   │   ├── subscription.service.ts      # Subscription rules, periods, limits, visibility answers
│   │   ├── payment.service.ts           # Payments + markPaid() (the single "paid" entry point)
│   │   ├── payment-providers/
│   │   │   ├── payment-provider.ts      # The shared shape every provider follows
│   │   │   ├── mock.provider.ts
│   │   │   └── manual.provider.ts
│   │   ├── email/
│   │   │   ├── email-queue.service.ts   # enqueue(): the ONLY way business logic "sends" email
│   │   │   ├── email-worker.service.ts  # Claim jobs, render, send, record result, retries
│   │   │   ├── email-admin.service.ts   # Admin: list jobs, counts, retry failed jobs
│   │   │   ├── senders/
│   │   │   │   ├── index.ts             # getEmailSender(): picks console or Resend from EMAIL_DRIVER
│   │   │   │   ├── email-sender.ts      # Shared shape: send({ to, subject, html, text })
│   │   │   │   ├── console.sender.ts    # Development: prints the email
│   │   │   │   └── resend.sender.ts     # Production: sends through Resend
│   │   │   └── templates/
│   │   │       ├── layout.ts            # Shared header/footer/styles
│   │   │       ├── index.ts             # Template name → template function
│   │   │       └── *.templates.ts       # The emails, grouped by topic (account, contact, …)
│   │   ├── storage.service.ts           # Checks (real file type, size) and saves/deletes uploaded images
│   │   ├── contact.service.ts           # Contact form → email job
│   │   ├── activity.service.ts          # Writes activity log entries
│   │   ├── admin.service.ts             # Admin overview numbers
│   │   ├── maintenance.service.ts       # Hourly subscription + reservation checks, daily cleanup
│   │   └── health.service.ts            # App + database status
│   │
│   ├── data/                            # ── LAYER 3: DATA (all SQL) ───────────────────
│   │   ├── db.ts                        # pg Pool built from env vars + withTransaction()
│   │   ├── pg-errors.ts                 # PostgreSQL error codes → domain errors
│   │   └── repositories/
│   │       ├── user.repository.ts
│   │       ├── auth-token.repository.ts
│   │       ├── business.repository.ts
│   │       ├── profile.repository.ts
│   │       ├── public-business.repository.ts   # The public visibility rule lives here (search, profile, cities)
│       ├── admin-business.repository.ts    # Admin business list and details
│   │       ├── category.repository.ts
│   │       ├── photo.repository.ts
│   │       ├── offering.repository.ts          # SQL for the "services" table
│   │       ├── schedule.repository.ts          # working_hours + blocked_times
│   │       ├── reservation.repository.ts
│   │       ├── quote.repository.ts
│   │       ├── plan.repository.ts
│   │       ├── subscription.repository.ts
│   │       ├── payment.repository.ts
│   │       ├── email-job.repository.ts
│   │       ├── activity.repository.ts
│   │       ├── stats.repository.ts             # Counts for admin and business overviews
│   │       └── health.repository.ts            # SELECT 1
│   │
│   └── models/                          # ── LAYER 4: MODELS (data shapes only) ────────
│       ├── enums.ts                     # Roles and every status list (matches the CHECK constraints)
│       ├── errors.ts                    # Domain errors with codes (no HTTP statuses)
│       ├── entities/                    # One type per table row: user.entity.ts, reservation.entity.ts, …
│       ├── dto/                         # Inputs/outputs passed between API and services
│       ├── requests/                    # Zod schemas for request bodies, queries and params
│       └── responses/                   # Shapes of the JSON returned to the frontend
│
├── migrations/                          # SQL migration files 001_… to 011_…, run in order (see DATABASE_DESIGN.md §10)
├── scripts/
│   └── migrate.ts                       # npm run migrate:up / migrate:down
├── seeds/
│   ├── seed.ts                          # Base data: categories, plans, first admin (safe in production)
│   ├── seed-demo.ts                     # Demo businesses and customers (development only)
│   ├── demo-images.ts                   # Makes gradient PNG images for the demo businesses
│   └── data/                            # categories.ts, plans.ts, demo.ts
├── tests/
│   ├── unit/                            # Service rules with fake repositories
│   ├── integration/                     # Repositories + API against a test database
│   └── helpers/                         # Test database setup, factories
├── uploads/                             # Local uploaded files in development (git-ignored)
├── .env.example                         # Every variable, with safe placeholder values
├── eslint.config.mjs                    # Includes the layer import rules (§3)
├── vitest.config.mts                    # Test settings (uses the quickquote_test database)
├── package.json
├── tsconfig.json
└── tsconfig.build.json                  # What `npm run build` compiles into dist/
```

**Style:** services and repositories are **plain TypeScript modules that export functions**, for example `reservationService.confirm(...)`. No classes or dependency-injection framework is needed.

---

## 3. Layer import rules

These rules are written into `eslint.config.mjs` with `no-restricted-imports`. If a file breaks them, `npm run lint` fails.

| Files in… | May import from | May **not** import from |
|---|---|---|
| `src/api/**` | `services` (except email senders), `models`, `config`, `express` | `data`, `pg`, `resend`, `services/email/senders` |
| `src/services/**` | `data`, `models`, `config` | `api`, `express` |
| `src/data/**` | `models`, `config`, `pg` | `api`, `services`, `express` |
| `src/models/**` | `zod` only | `api`, `services`, `data`, `config`, `express`, `pg` |
| `src/worker.ts` | `services`, `config`, `lifecycle.ts` | `api`, `data/repositories`, `express`, `pg` |
| `seeds/**` | `services`, `config`, `data/db.ts` (only to close the pool) | `api`, `data/repositories`, `express`, `pg` |
| `src/server.ts`, `src/all.ts` | `api`, `services`, `lifecycle.ts` | — |

Quick self-check before every commit:

- Is there any SQL outside `src/data/`? → move it into a repository.
- Is there any `req`, `res` or HTTP status code outside `src/api/`? → move it into a controller or middleware.
- Does a controller call a repository? → put a service in between.

---

## 4. Frontend structure

```
frontend/
├── index.html
├── vite.config.ts                 # Dev server (port 5173); forwards /api and /health to http://localhost:4000
├── eslint.config.js               # Code checks, including the React hooks rules
├── tsconfig.json                  # + tsconfig.app.json (the website) and tsconfig.node.json (vite.config.ts)
├── .env.example                   # VITE_API_URL (empty in development)
├── public/favicon.svg
└── src/
    ├── main.tsx                   # Starts React
    ├── App.tsx                    # Router + AuthProvider
    ├── router.tsx                 # ALL routes (29 pages), grouped by layout and protected by role
    ├── api/                       # Talking to the backend
    │   ├── client.ts              # fetch wrapper: JSON, login cookie, ApiError with field errors
    │   ├── auth.api.ts            # register, login, logout, me, verify email, passwords, account settings
    │   ├── public.api.ts          # categories, plans, contact form
    │   ├── business.api.ts        # business dashboard: overview, profile, photos, services, hours, settings
    │   └── admin.api.ts           # email queue stats, list, retry
    ├── context/
    │   ├── auth-context.ts        # The shape of the auth context
    │   └── AuthProvider.tsx       # Who is logged in (asks GET /api/auth/me on page load)
    ├── hooks/
    │   ├── useAuth.ts             # const { user, login, logout } = useAuth()
    │   └── useApi.ts              # const { data, loading, error, reload } = useApi('plans', () => publicApi.plans())
    ├── components/
    │   ├── ui/                    # Button, TextField/SelectField/TextAreaField, Card, Alert, Badge/StatusBadge,
    │   │                          # Spinner, PageHeader, ComingSoon, Logo, CategoryIcon (lucide icons)
    │   ├── layout/                # PublicLayout, DashboardLayout, Navbar, Footer, AuthCard,
    │   │                          # EmailVerificationBanner, ScrollToTop
    │   ├── guards/                # ProtectedRoute (login + role), GuestOnlyRoute
    │   ├── business/              # BusinessCard, BusinessLogo, GoLiveChecklist, CategoryPicker, UsageMeter, ImageUploadButton
    │   └── account/               # AccountSettings (name, phone, password), shared by customers and owners
    ├── pages/
    │   ├── public/                # HomePage, ExplorePage, BusinessDetailsPage, AboutPage, ContactPage, PricingPage
    │   ├── auth/                  # CustomerRegisterPage, BusinessRegisterPage, LoginPage,
    │   │                          # ForgotPasswordPage, ResetPasswordPage, VerifyEmailPage
    │   ├── customer/              # CustomerOverviewPage, MyReservationsPage, MyQuoteRequestsPage, CustomerSettingsPage
    │   ├── business/              # BusinessOverviewPage, EditProfilePage, ManageServicesPage, WorkingHoursPage,
    │   │                          # BusinessReservationsPage, BusinessQuoteRequestsPage, SubscriptionPage,
    │   │                          # BusinessSettingsPage
    │   ├── admin/                 # AdminOverviewPage, ManageBusinessesPage, ManageCustomersPage,
    │   │                          # AdminReservationsPage, AdminQuoteRequestsPage, ManageSubscriptionsPage,
    │   │                          # ManageCategoriesPage
    │   └── NotFoundPage.tsx
    ├── types/api.ts               # TypeScript types matching the API responses
    ├── utils/                     # format.ts (prices, durations, dates), roles.ts, timezones.ts
    ├── styles/index.css           # Tailwind + brand colours
    └── test/setup.ts              # Test helpers (jest-dom matchers)
```

**How the 29 pages map to files:** each numbered page in [FEATURES.md → Pages](FEATURES.md#7-pages) is one file in `src/pages/`. Pieces shared by several pages (such as `StatusBadge` or `AccountSettings`) live in `src/components/`. Pages whose features belong to a later phase already exist and show a "Phase N" panel listing what will come.

**Security note:** `ProtectedRoute` only makes the website friendly (it hides pages you cannot use). The real protection is the backend, which checks the login cookie and the role on every request.

---

## 5. Naming conventions

| Thing | Convention | Example |
|---|---|---|
| Backend files | `kebab-case` + role suffix | `reservation.service.ts`, `reservation.repository.ts`, `reservation.controller.ts`, `reservation.entity.ts` |
| React components and pages | `PascalCase.tsx`. Pages end in `Page`. | `BusinessCard.tsx`, `ExplorePage.tsx` |
| Types and interfaces | `PascalCase` | `Reservation`, `CreateReservationDto` |
| Functions and variables | `camelCase` | `getAvailableSlots`, `startsAt` |
| Constants and environment variables | `UPPER_SNAKE_CASE` | `MAX_PAGE_SIZE`, `DATABASE_URL` |
| Database tables and columns | `snake_case` | `quote_requests.created_at` |
| JSON fields in the API | `camelCase` | `createdAt` |
| URL paths | `kebab-case`, plural nouns | `/api/business/quote-requests` |
| Status values | `snake_case` strings | `pending_review`, `past_due` |

**"Service" vs "offering":** the word *service* has two meanings here. It can mean the **Services layer** (business logic), or a **service a business sells** (a haircut). To avoid confusion:

- **Users, pages, API paths and the database** say **services** (`/api/business/services`, table `services`), because that is the natural word for customers and businesses.
- **Backend code** calls a sold service an **offering**: `offering.service.ts`, `offering.repository.ts`, type `Offering`. That way `offering.service.ts` clearly means "the business logic for offerings".

---

## 6. Where does my code go?

| I want to… | Put it in… |
|---|---|
| Add a new URL | `api/routes/*.routes.ts` + a controller function |
| Check the shape of incoming data | A Zod schema in `models/requests/`, checked in the controller with `parseRequest(schema, req.body)` |
| Add or change a business rule | The matching file in `services/` |
| Read or write the database | A function in `data/repositories/` |
| Change the database structure | A **new** file in `migrations/` |
| Describe a table row | `models/entities/` |
| Describe what an endpoint returns | `models/responses/` |
| Add a new error type | `models/errors.ts`, then map its code in `api/middleware/error-handler.ts` |
| Send a new kind of email | A template in `services/email/templates/`, registered in `templates/index.ts`, then call `emailQueueService.enqueue(...)` from a service |
| Add a scheduled task | `services/maintenance.service.ts`, then start it from `worker.ts` |
| Add a new setting | `config/env.ts` + `.env.example` + the variables table in the README |
| Add starting data | `seeds/data/` |
| Add a new page | `frontend/src/pages/...` + a route in `frontend/src/router.tsx` + API functions in `frontend/src/api/` |

---

## 7. Example: adding a feature from start to finish

Imagine we later add **"customers can leave a review after a completed reservation"**. Here is the path through every layer:

| Step | File | What you write |
|---|---|---|
| 1 | `migrations/…_create-reviews.sql` | Table `reviews` (`reservation_id` UNIQUE, `rating` 1–5, `comment`) |
| 2 | `models/entities/review.entity.ts` | `Review` type |
| 3 | `models/requests/review.requests.ts` | Zod schema: `rating` 1–5, `comment` up to 1000 characters |
| 4 | `models/responses/review.response.ts` | What the API returns |
| 5 | `data/repositories/review.repository.ts` | `insert()`, `listByBusiness()` (SQL) |
| 6 | `services/review.service.ts` | Rules: the reservation must be `completed`, belong to the customer, and not already have a review. Queue an email to the business. |
| 7 | `api/controllers/customer/review.controller.ts` | Read the body, call the service, send `201` |
| 8 | `api/routes/customer.routes.ts` | `POST /api/customer/reservations/:id/review` (the controller calls `parseRequest(...)`) |
| 9 | `tests/` | Unit test for the rules, integration test for the endpoint |
| 10 | `frontend/src/...` | A "Leave a review" form in My Reservations |

Each step only talks to the layer directly below it.

---

## 8. Scripts

### Backend (`backend/package.json`)

| Command | What it does |
|---|---|
| `npm run dev` | Starts the API server and restarts it when files change |
| `npm run dev:worker` | Starts the worker and restarts it when files change |
| `npm run build` | Compiles TypeScript into `dist/` |
| `npm run start` | Runs the compiled API server (production) |
| `npm run start:worker` | Runs the compiled worker (production) |
| `npm run start:all` | Runs API + worker in one process (for hosting plans without a separate worker) |
| `npm run migrate:deploy` | Applies migrations with the compiled code (production, after `npm run build`) |
| `npm run seed:deploy` | Runs the seed with the compiled code (production) |
| `npm run migrate:up` | Applies new migrations |
| `npm run migrate:down` | Undoes the last migration |
| `npm run migrate:create -- <name>` | Creates a new, empty migration file |
| `npm run seed` | Inserts base data (categories, plans, first admin) |
| `npm run seed:demo` | *(later phase)* Inserts demo data (refuses to run in production) |
| `npm test` | Runs all tests |
| `npm run lint` | Checks code style **and the layer rules** |
| `npm run typecheck` | Checks TypeScript types without building |

### Frontend (`frontend/package.json`)

| Command | What it does |
|---|---|
| `npm run dev` | Starts the development website at `http://localhost:5173` |
| `npm run build` | Builds the static files into `dist/` |
| `npm run preview` | Serves the built files locally to test them |
| `npm run lint` / `npm run typecheck` | Code checks |

---

## 9. Local development setup (preview)

This is how starting the project will work once the code exists.

1. Install **Node.js 22 (LTS)** and **Docker Desktop**.
2. Start PostgreSQL:
   ```bash
   docker compose up -d
   ```
3. Set up the backend:
   ```bash
   cd backend
   cp .env.example .env
   npm install
   npm run migrate:up
   npm run seed
   ```
4. Start the API server (terminal 1):
   ```bash
   npm run dev
   ```
5. Start the worker (terminal 2):
   ```bash
   npm run dev:worker
   ```
6. Start the frontend (terminal 3):
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
7. Open `http://localhost:5173`, and check the health endpoint:
   ```bash
   curl -i http://localhost:4000/health
   ```

---

## 10. Environment files and secrets

| File | Committed to Git? | Content |
|---|---|---|
| `backend/.env.example` | Yes | Every variable with **safe placeholder values**, never real keys |
| `backend/.env` | Never (git-ignored) | Your real local values |
| `frontend/.env.example` | Yes | `VITE_API_URL=` |
| Hosting platform settings | — | Real production values (database URL, `RESEND_API_KEY`, `JWT_SECRET`) |

Preview of `backend/.env.example`:

```dotenv
NODE_ENV=development
PORT=4000

# PostgreSQL (matches docker-compose.yml)
DATABASE_URL=postgres://quickquote:quickquote@localhost:5432/quickquote
DATABASE_SSL=false
DATABASE_POOL_MAX=10

# Auth: replace with a long random string
JWT_SECRET=change-me-to-a-long-random-string
JWT_EXPIRES_IN=7d

FRONTEND_URL=http://localhost:5173
API_PUBLIC_URL=http://localhost:4000

# Email: "console" prints emails, "resend" sends them
EMAIL_DRIVER=console
RESEND_API_KEY=re_your_api_key_here
EMAIL_FROM="Quick Quote <noreply@example.com>"
ADMIN_NOTIFICATION_EMAIL=admin@example.com
EMAIL_POLL_INTERVAL_MS=5000
EMAIL_BATCH_SIZE=10
EMAIL_MAX_ATTEMPTS=5
EMAIL_SEND_TIMEOUT_MS=10000
EMAIL_LOCK_TIMEOUT_MINUTES=10

# Payments: "mock" (development) or "manual" (bank transfer)
PAYMENT_PROVIDER=mock
MANUAL_PAYMENT_INSTRUCTIONS="Bank: Example Bank, IBAN: XX00 0000 0000 0000, put the reference in the description"

STORAGE_DRIVER=local
UPLOAD_DIR=./uploads

HEALTH_DB_TIMEOUT_MS=2000

# Used only by "npm run seed"
SEED_ADMIN_EMAIL=admin@example.com
SEED_ADMIN_PASSWORD=change-me
```

`.gitignore` will contain at least: `node_modules/`, `dist/`, `.env`, `uploads/`, `coverage/`.

**If a real key is ever committed by mistake:** revoke it immediately in the provider's dashboard (for example Resend) and create a new one. Removing the commit is not enough, because Git history keeps it.

---

## 11. README contents (delivery checklist)

When the backend is built, the root `README.md` will be rewritten to include:

| Section | Content |
|---|---|
| About | What Quick Quote is, in a few sentences |
| Architecture | Mermaid diagram of API server, worker, PostgreSQL, Resend and Asniher, plus the four layers and their rules |
| Setup | The local setup steps from §9 |
| Environment variables | A table of every variable: required or optional, example, meaning |
| Example requests | Ready-to-copy `curl` commands: health check, register, login, contact form (enqueues an email), create a reservation, list email jobs |
| Email queue | How jobs move from `pending` to `sent` or `failed`, the retry schedule, and how to watch retries with a `@fail.test` address |
| Deployment and monitoring | Live URL, hosting setup, Asniher monitor details, and the **monitor screenshot** (`docs/images/asniher-monitor.png`) |
| Documentation | Links to all documents in `docs/` |

---

## 12. Git workflow and commit history

A clean history makes the project easy to review and easy to roll back.

**Rules**

1. **One logical change per commit.** For example, "add health endpoint", not "lots of stuff".
2. **Conventional Commit messages:** `type(scope): short description`.

   | Type | Use for |
   |---|---|
   | `feat` | New functionality |
   | `fix` | Bug fixes |
   | `docs` | Documentation only |
   | `test` | Adding or changing tests |
   | `refactor` | Code changes that don't change behaviour |
   | `chore` | Setup, tooling, dependencies, configuration |

3. **Check before committing:** run `npm run lint`, `npm run typecheck` and `npm test`, and read `git diff --staged`.
4. **Never commit** `.env`, real API keys, `node_modules/`, build output or uploaded files.
5. Work on a branch and merge into `main` when a piece is finished and working.

**What the backend milestone history will look like**

```text
docs: add architecture and planning documents
chore(backend): set up TypeScript, Express, ESLint layer rules
chore(db): add docker-compose for local PostgreSQL
feat(db): add database pool configured from environment variables
feat(db): add initial migrations
feat(db): add seed scripts for categories, plans and admin user
feat(health): add GET /health with database check (200/503)
feat(email): add email_jobs repository and queue service
feat(email): add background worker with Resend sender and retries
feat(auth): add registration and login that enqueue welcome emails
feat(contact): add contact endpoint that enqueues an admin email
test: add tests for email retries and health check
docs: add README with setup, env vars, diagram and example requests
chore(deploy): add deployment configuration
docs: add Asniher monitor screenshot
```
