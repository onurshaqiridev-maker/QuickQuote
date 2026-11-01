# Quick Quote

Quick Quote is a platform for finding businesses, requesting quotes and booking appointments.

- **Businesses** pay a monthly subscription. For that they get a public profile, a list of their services and prices, and they can receive quotation requests and reservations.
- **Customers** use the platform for free. They can find businesses, compare services, request quotes and book appointments.
- **Administrators** run the platform. They approve businesses, manage categories and plans, and keep an eye on activity.

This repository contains:
- the **backend**: a small monolithic Node.js + TypeScript application with a PostgreSQL database and an email queue that sends through [Resend](https://resend.com),
- the **frontend**: a React website (Vite + TypeScript + Tailwind CSS) that talks to the backend.

See the [roadmap](docs/PROJECT_OVERVIEW.md#9-implementation-roadmap) for what comes next.

| | |
|---|---|
| **Status** | **Phases 1, 2, 4 and 5 done:** the four-layer backend (migrations, seed, `GET /health`, email queue + worker, accounts), the frontend foundation (all 29 pages routed, login and registration, settings, contact form, admin email queue) and the business profile (profile details, logo and photos, categories, services and prices, working hours, blocked times, booking settings, go-live checklist, publishing). **Listing is free during the launch** (no payments). Customers can **explore** businesses (search, category and city filters, public profiles), and admins **review and approve** businesses. **Phase 3** (deployment on Render + Asniher monitoring) is ready: see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). |
| **Backend** | Node.js 22, Express 5, TypeScript, PostgreSQL 16, `pg` with plain SQL, `node-pg-migrate`, Zod, Resend, pino, Vitest |
| **Frontend** | React 19, Vite, TypeScript, React Router, Tailwind CSS 4, Vitest + Testing Library |

---

## Contents

1. [Architecture](#architecture)
2. [How the email queue works](#how-the-email-queue-works)
3. [Getting started](#getting-started)
4. [Environment variables](#environment-variables)
5. [Example requests](#example-requests)
6. [Scripts](#scripts)
7. [Tests](#tests)
8. [Deployment and monitoring](#deployment-and-monitoring)
9. [Project structure](#project-structure)
10. [Planning documents](#planning-documents)

---

## Architecture

```mermaid
flowchart LR
    CLIENT["Client<br/>browser, curl, frontend"]
    MON["Asniher<br/>uptime monitor"]

    subgraph BACKEND["Backend: one codebase, two processes"]
        direction TB
        subgraph APIP["API server: src/server.ts"]
            direction TB
            L1["1. api<br/>routes, controllers,<br/>validation, HTTP responses"]
            L2["2. services<br/>business logic"]
            L3["3. data<br/>repositories, all SQL"]
            L1 --> L2 --> L3
        end
        subgraph WP["Email worker: src/worker.ts"]
            direction TB
            W2["services<br/>email-worker.service"]
            W3["data<br/>email-job.repository"]
            W2 --> W3
        end
        L4["4. models<br/>entities, DTOs,<br/>request and response models"]
    end

    DB[("PostgreSQL<br/>all data + email_jobs queue")]
    RESEND["Resend<br/>email API"]

    CLIENT -->|"HTTPS JSON /api/..."| L1
    MON -->|"GET /health"| L1
    L3 -->|"SQL: INSERT email_jobs status pending"| DB
    W3 -->|"claim due jobs, mark sent or failed"| DB
    W2 -->|"send email"| RESEND
    L2 -.-> L4
    W2 -.-> L4
```

**The four layers** (all in `backend/src/`):

| Layer | Folder | Does | Never does |
|---|---|---|---|
| **api** | `src/api` | Routes, controllers, request validation, cookies, HTTP status codes and JSON responses | SQL, business rules |
| **services** | `src/services` | Business logic: registration, login, email confirmation, the email queue and the worker | HTTP (`req`, `res`, status codes), SQL |
| **data** | `src/data` | Repositories with **all** SQL, the connection pool, transactions | Business rules, HTTP |
| **models** | `src/models` | Entities, DTOs, request models (Zod schemas), response models, enums, domain errors | Imports from other layers, I/O |

**Rules:** each layer only calls the layer directly below it: `api → services → data → PostgreSQL`. `models` holds plain data shapes that every layer may import.

The rules are **enforced automatically**. `eslint.config.mjs` contains a `no-restricted-imports` rule per layer, so `npm run lint` fails if, for example:
- a controller imports a repository, `pg` or the Resend sender,
- a service imports `express`,
- a model imports anything from another layer.

**Errors:** services throw domain errors that carry a code (for example `EMAIL_TAKEN`) but no HTTP status. The API's error handler is the only place that turns codes into HTTP statuses.

Full details: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## How the email queue works

**HTTP endpoints never send emails.** They only add a row to the `email_jobs` table, inside the same database transaction as the change that caused the email. A separate **background worker** sends the emails through Resend.

```mermaid
sequenceDiagram
    autonumber
    participant C as Client
    participant API as API server
    participant DB as PostgreSQL
    participant W as Email worker
    participant R as Resend

    C->>API: POST /api/auth/register/customer
    API->>DB: BEGIN, INSERT user, INSERT email_job status pending, COMMIT
    API-->>C: 201 Created, no email sent yet
    loop every 5 seconds
        W->>DB: claim due pending jobs, FOR UPDATE SKIP LOCKED
    end
    W->>R: send email
    alt accepted
        W->>DB: status sent
    else error, attempts left
        W->>DB: stay pending, retry later
    else error, 5th attempt
        W->>DB: status failed
    end
```

| Job status | Meaning |
|---|---|
| `pending` | Waiting to be sent, or waiting for its next retry |
| `sent` | Resend accepted the email |
| `failed` | All attempts failed. An admin can retry it with `POST /api/admin/email-jobs/:id/retry`. |

**Retries:** every job gets **5 attempts = 1 try + 4 retries**, with growing waits between them:

| Attempt that failed | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|
| What happens | retry in 1 min | retry in 5 min | retry in 15 min | retry in 60 min | status `failed` |

**Safety features:**
- `FOR UPDATE SKIP LOCKED` means two workers never send the same job.
- A worker that crashes while sending leaves a lock, which expires after 10 minutes. The job is then picked up again.
- Each attempt passes an idempotency key to Resend.

**Try the retries yourself:** with `EMAIL_DRIVER=console`, any address ending in `@fail.test` always fails (outside production). Register `demo@fail.test` and watch its job in `GET /api/admin/email-jobs`.

Full details: [docs/EMAIL_WORKFLOW.md](docs/EMAIL_WORKFLOW.md).

---

## Getting started

**You need:** Node.js 22 or newer, and Docker (for PostgreSQL). Without Docker, any PostgreSQL 14+ works: create the databases `quickquote` and `quickquote_test` and adjust `DATABASE_URL`.

1. Start PostgreSQL. This also creates the `quickquote_test` database used by the tests:

   ```bash
   docker compose up -d
   ```

2. Install the backend and create your `.env` file:

   ```bash
   cd backend
   npm install
   cp .env.example .env
   ```

3. Create the tables and the starting data (12 categories, 3 plans, and the admin account from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`):

   ```bash
   npm run migrate:up
   npm run seed
   ```

   Optional, for development: add 8 demo businesses with logos, photos, services and hours, 1 business waiting for review, and 3 demo customers (password `QuickQuote2026`, e.g. `bella.demo@example.com` or `sara.demo@example.com`):

   ```bash
   npm run seed:demo
   ```

4. Start the API server (terminal 1):

   ```bash
   npm run dev
   ```

5. Start the email worker (terminal 2):

   ```bash
   npm run dev:worker
   ```

6. Check that it works:

   ```bash
   curl -i http://localhost:4000/health
   ```

7. Start the website (terminal 3):

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

   Open **http://localhost:5173**. In development, Vite forwards `/api` requests to the backend on port 4000, so the login cookie works without any extra setup. Log in as the seeded admin (`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`) to see the email queue in the admin dashboard.

With the default `EMAIL_DRIVER=console`, emails are **printed in the worker's terminal** instead of being sent. To send real emails, set `EMAIL_DRIVER=resend` and `RESEND_API_KEY` (see below).

---

## Environment variables

Every setting comes from environment variables. In development they are read from `backend/.env` (copy [`backend/.env.example`](backend/.env.example)). When the app starts, `src/config/env.ts` checks them all. If something is missing or invalid, the app stops with a clear message.

| Variable | Required | Default | Meaning |
|---|---|---|---|
| `NODE_ENV` | no | `development` | `development`, `test` or `production` |
| `PORT` | no | `4000` | Port of the API server |
| `LOG_LEVEL` | no | `info` | `fatal`, `error`, `warn`, `info`, `debug`, `trace` |
| `DATABASE_URL` | **yes** | — | PostgreSQL connection string: `postgres://USER:PASSWORD@HOST:PORT/DATABASE` |
| `DATABASE_SSL` | no | `false` | `true` if the database requires SSL (most hosted databases) |
| `DATABASE_POOL_MAX` | no | `10` | Maximum database connections |
| `JWT_SECRET` | **yes** | — | Secret that signs login sessions (at least 32 characters) |
| `JWT_EXPIRES_IN` | no | `7d` | How long a login lasts (in days, e.g. `7d`) |
| `FRONTEND_URL` | no | `http://localhost:5173` | Allowed browser origin (CORS) and base URL for links in emails |
| `API_PUBLIC_URL` | no | `http://localhost:4000` | Public address of this API |
| `EMAIL_DRIVER` | no | `console` | `console` (print emails) or `resend` (really send) |
| `RESEND_API_KEY` | if `resend` | — | Your Resend API key |
| `EMAIL_FROM` | no | `Quick Quote <onboarding@resend.dev>` | Sender. Must be on a domain verified in Resend for real sending. |
| `ADMIN_NOTIFICATION_EMAIL` | no | `admin@example.com` | Receives contact form messages and "new business" notices |
| `EMAIL_POLL_INTERVAL_MS` | no | `5000` | How often the worker looks for due jobs |
| `EMAIL_BATCH_SIZE` | no | `10` | Jobs claimed per round |
| `EMAIL_MAX_ATTEMPTS` | no | `5` | Attempts per email (minimum `4` = at least 3 retries) |
| `EMAIL_SEND_TIMEOUT_MS` | no | `10000` | A send taking longer than this counts as a failed attempt |
| `EMAIL_LOCK_TIMEOUT_MINUTES` | no | `10` | After this, a job claimed by a crashed worker can be claimed again |
| `SUBSCRIPTIONS_REQUIRED` | no | `false` | `false` = free launch: businesses publish without paying. `true` once paid plans exist. |
| `UPLOAD_DIR` | no | `./uploads` | Folder for uploaded logos and photos (served at `/uploads/...`) |
| `HEALTH_DB_TIMEOUT_MS` | no | `2000` | `/health` reports the database as unreachable after this time |
| `SEED_ADMIN_EMAIL` | for seed | — | Email of the first admin, created by `npm run seed` |
| `SEED_ADMIN_PASSWORD` | for seed | — | Password of the first admin |

`.env.example` only contains placeholders. Real keys go in `.env` (git-ignored) or in your hosting platform's settings.

---

## Example requests

All responses are JSON. Successful ones look like `{ "data": ... }` (lists also have `"meta"`), and errors look like `{ "error": { "code", "message", "details"? } }`. The login session is an httpOnly cookie, so the examples store it with `-c` and send it with `-b`.

### Health check

```bash
curl -i http://localhost:4000/health
```

```json
HTTP/1.1 200 OK
{ "status": "ok", "checks": { "app": "ok", "database": "ok" }, "uptimeSeconds": 42, "timestamp": "2026-11-01T15:26:35.740Z" }
```

If PostgreSQL is down or slower than 2 seconds:

```json
HTTP/1.1 503 Service Unavailable
{ "status": "error", "checks": { "app": "ok", "database": "unreachable" }, "uptimeSeconds": 51, "timestamp": "2026-11-01T15:27:23.112Z" }
```

### Register a customer (queues a welcome email)

```bash
curl -i -c cookies.txt -X POST http://localhost:4000/api/auth/register/customer \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Sara Miller","email":"sara@example.com","password":"MySecret123"}'
```

```json
HTTP/1.1 201 Created
Set-Cookie: qq_session=...; HttpOnly; SameSite=Lax
{ "data": { "user": { "id": "232f7bc5-...", "email": "sara@example.com", "fullName": "Sara Miller", "role": "customer", "emailVerified": false, ... } } }
```

The response comes back immediately. The `customer_welcome` email waits in `email_jobs` as `pending` until the worker sends it.

### Validation errors

```bash
curl -s -X POST http://localhost:4000/api/auth/register/customer \
  -H "Content-Type: application/json" \
  -d '{"fullName":"S","email":"bad","password":"short"}'
```

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Some fields are not valid.", "details": [
  { "field": "fullName", "message": "Name must be at least 2 characters." },
  { "field": "email", "message": "Please enter a valid email address." },
  { "field": "password", "message": "Password must be at least 8 characters." },
  { "field": "password", "message": "Password must contain at least one number." } ] } }
```

### Log in and see who you are

```bash
curl -s -c cookies.txt -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"sara@example.com","password":"MySecret123"}'
```

```bash
curl -s -b cookies.txt http://localhost:4000/api/auth/me
```

### Register a business (queues two emails)

First, get a category ID:

```bash
curl -s http://localhost:4000/api/categories
```

```bash
curl -s -X POST http://localhost:4000/api/auth/register/business \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Lena Novak","email":"lena@bellahair.example","password":"SalonPass2026","businessName":"Bella Hair Studio","city":"Berlin","timezone":"Europe/Berlin","categoryIds":["<category id>"]}'
```

```json
{ "data": { "user": { "role": "business_owner", ... },
            "business": { "status": "pending_review", "slug": "bella-hair-studio", "displayName": "Bella Hair Studio", "isPublished": false } } }
```

### Contact form (202 Accepted: the email is queued)

```bash
curl -i -X POST http://localhost:4000/api/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"Demo User","email":"demo@example.com","subject":"Hello","message":"Just testing the email queue."}'
```

### Forgot password

```bash
curl -s -X POST http://localhost:4000/api/auth/forgot-password \
  -H "Content-Type: application/json" -d '{"email":"sara@example.com"}'
```

The answer is the same whether or not the account exists, so nobody can probe which emails are registered.

### Admin: watch the email queue

Log in as the seeded admin:

```bash
curl -s -c admin.txt -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"change-me-please"}'
```

Counts per status:

```bash
curl -s -b admin.txt http://localhost:4000/api/admin/email-jobs/stats
```

```json
{ "data": { "pending": 0, "sent": 4, "failed": 1 } }
```

List failed jobs:

```bash
curl -s -b admin.txt "http://localhost:4000/api/admin/email-jobs?status=failed"
```

```json
{ "data": [ { "id": "e215f9f5-...", "toEmail": "demo@fail.test", "template": "customer_welcome", "status": "failed",
              "attempts": 5, "maxAttempts": 5, "lastError": "Simulated failure: \"demo@fail.test\" ends with @fail.test", ... } ],
  "meta": { "page": 1, "pageSize": 20, "total": 1 } }
```

Put a failed job back in the queue:

```bash
curl -s -b admin.txt -X POST http://localhost:4000/api/admin/email-jobs/<job id>/retry
```

### All endpoints available now

| Method | Path | Who | Purpose |
|---|---|---|---|
| `GET` | `/` | public | Short API info (name, where the health check is) |
| `GET` | `/health` | public | App + database status (200 / 503) |
| `POST` | `/api/auth/register/customer` | public | Create a customer account (queues `customer_welcome`) |
| `POST` | `/api/auth/register/business` | public | Create a business account (queues `business_welcome` + `admin_new_business`) |
| `POST` | `/api/auth/login` | public | Log in (sets the session cookie) |
| `POST` | `/api/auth/logout` | public | Log out (clears the cookie) |
| `GET` | `/api/auth/me` | logged in | The current user |
| `POST` | `/api/auth/verify-email` | public | Confirm an email with the token from the email link |
| `POST` | `/api/auth/resend-verification` | logged in | Queue a new confirmation email |
| `POST` | `/api/auth/forgot-password` | public | Queue a password reset email |
| `POST` | `/api/auth/reset-password` | public | Set a new password with the emailed token |
| `PUT` | `/api/account/profile` | logged in | Update name and phone |
| `POST` | `/api/account/change-password` | logged in | Change password |
| `GET` | `/api/categories` | public | Active business categories |
| `POST` | `/api/contact` | public | Contact form (queues `contact_message_admin`) |
| `GET` | `/api/config` | public | Platform settings, e.g. `subscriptionsRequired` (free launch) |
| `GET` | `/api/plans` | public | Active subscription plans (pricing page) |
| `GET` | `/api/businesses` | public | Search visible businesses (`search`, `category`, `city`, `featured`, `page`, `pageSize`) |
| `GET` | `/api/businesses/:slug` | public | Public profile: photos, services, prices, hours, contact |
| `GET` | `/api/cities` | public | Cities with visible businesses |
| `GET` | `/api/admin/businesses` | admin | List businesses (`status`, `search`, `page`) |
| `GET` | `/api/admin/businesses/:id` | admin | Business details for review |
| `POST` | `/api/admin/businesses/:id/approve` / `suspend` / `deactivate` / `reactivate` | admin | Change the status (suspend and deactivate need `{ "reason" }`); the owner is emailed |
| `GET` | `/api/business/overview` | business | Go-live checklist, plan usage, visibility |
| `GET` / `PUT` | `/api/business/profile` | business | Read / update the profile details |
| `POST` / `DELETE` | `/api/business/profile/logo` | business | Upload (multipart, field `file`) / remove the logo |
| `POST` | `/api/business/profile/publish` / `unpublish` | business | Publish (checks the checklist) / hide the profile |
| `PUT` | `/api/business/categories` | business | Set 1 to 3 categories |
| `POST` / `PUT` / `DELETE` | `/api/business/photos`, `/photos/order`, `/photos/:id` | business | Upload, reorder, delete photos (plan limit) |
| `GET` / `POST` / `PUT` / `DELETE` | `/api/business/services[/:id]` | business | List, add, edit, archive services (plan limit) |
| `GET` / `PUT` | `/api/business/working-hours` | business | Weekly hours (whole week at once, no overlaps) |
| `GET` / `POST` / `DELETE` | `/api/business/blocked-times[/:id]` | business | Holidays and other blocked periods |
| `GET` / `PUT` | `/api/business/settings` | business | Booking settings |
| `GET` | `/api/admin/email-jobs` | admin | List email jobs (`?status=pending\|sent\|failed&page=1&pageSize=20`) |
| `GET` | `/api/admin/email-jobs/stats` | admin | Count of jobs per status |
| `POST` | `/api/admin/email-jobs/:id/retry` | admin | Retry a failed job |

The full planned API is in [docs/API_DESIGN.md](docs/API_DESIGN.md).

---

## Scripts

**Frontend** (run in `frontend/`): `npm run dev` (website at http://localhost:5173), `npm run build` (production files in `dist/`), `npm test`, `npm run lint`, `npm run typecheck`.

**Backend:** run these in `backend/`:

| Command | What it does |
|---|---|
| `npm run dev` | API server with auto-reload |
| `npm run dev:worker` | Email worker with auto-reload |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run start` | Run the compiled API server |
| `npm run start:worker` | Run the compiled email worker |
| `npm run start:all` | API server and worker in **one** process (for hosting plans without a separate worker) |
| `npm run migrate:up` | Apply new migrations |
| `npm run migrate:down` | Undo the last migration |
| `npm run migrate:create -- <name>` | Create a new SQL migration file |
| `npm run seed` | Insert categories, plans and the first admin (safe to run again) |
| `npm run seed:demo` | Development only: demo businesses and customers (refuses to run in production) |
| `npm run migrate:deploy` / `npm run seed:deploy` | The same, using the compiled code (used on Render after `npm run build`) |
| `npm test` | Run all tests |
| `npm run lint` | Code style **and the layer rules** |
| `npm run typecheck` | TypeScript type check |

---

## Tests

Backend:

```bash
cd backend
npm test
```

Frontend (price formatting, API error handling, role-protected pages):

```bash
cd frontend
npm test
```

The tests use a separate database, `quickquote_test` (override it with `TEST_DATABASE_URL`). It is wiped and migrated automatically before every run. They cover:

- `GET /health` returns **200** with a working database and **503** when it is unreachable
- registration, login, sessions, suspended accounts, email confirmation, password reset, account settings
- endpoints only **enqueue** emails, and nothing is sent during the request
- the worker sends due jobs, **retries 4 times** with growing waits, then marks jobs **failed**
- two workers running at the same time never send the same email twice
- admin queue endpoints (list, stats, retry), and customers are refused

---

## Deployment and monitoring

The backend is deployed on **[Render](https://render.com)** using the Blueprint in [`render.yaml`](render.yaml). It creates:
- a **PostgreSQL** database,
- one **web service** that runs the API and the email worker together (`node dist/src/all.js`), because Render's free plan has no background workers.

On every start, the service applies new migrations (`npm run migrate:deploy`), makes sure the seed data exists (`npm run seed:deploy`), and then starts. Render also uses `GET /health` as its own health check.

**Asniher** monitors `GET /health` every minute and alerts when the answer is not `200`.

**Step-by-step guide:** [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

| | |
|---|---|
| **Live URL** | *(added after the first deploy)* |
| **Health check** | `<live URL>/health` |
| **Asniher monitor** | *(screenshot added after setup: `docs/images/asniher-monitor.png`)* |

---

## Project structure

```
QuickQuote/
├── docker-compose.yml        # Local PostgreSQL (+ test database)
├── render.yaml               # Render Blueprint: database + web service (deployment)
├── docs/                     # Planning documents
└── backend/
    ├── migrations/           # 001_… to 011_… SQL migrations (the full database design)
    ├── scripts/migrate.ts    # Migration runner
    ├── seeds/                # Seed script + starting data (categories, plans)
    ├── src/
    │   ├── server.ts         # Entry point: API server
    │   ├── worker.ts         # Entry point: email worker
    │   ├── all.ts            # Entry point: both in one process
    │   ├── config/           # Environment variables, logger
    │   ├── api/              # LAYER 1: routes, controllers, middleware, validation
    │   ├── services/         # LAYER 2: business logic, email queue + worker
    │   ├── data/             # LAYER 3: connection pool, repositories (all SQL)
    │   └── models/           # LAYER 4: entities, DTOs, request/response models
    └── tests/                # Unit + integration tests
└── frontend/
    └── src/
        ├── api/              # fetch wrapper + one file per API area
        ├── context/, hooks/  # who is logged in (useAuth), loading data (useApi)
        ├── components/       # UI building blocks, layouts, route guards
        ├── pages/            # the 29 pages: public, auth, customer, business, admin
        └── router.tsx        # every URL and which role may open it
```

Full explanation: [docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md).

---

## Planning documents

| Document | What it answers |
|---|---|
| [Project Overview](docs/PROJECT_OVERVIEW.md) | Goals, tech choices, roadmap, [backend requirements checklist](docs/PROJECT_OVERVIEW.md#10-backend-requirements-checklist) |
| [Features](docs/FEATURES.md) | Every feature, all 29 pages, permissions |
| [User Flows](docs/USER_FLOWS.md) | Step-by-step journeys, including the reservation workflow diagram |
| [Architecture](docs/ARCHITECTURE.md) | System diagram, the four layers, security, health check, deployment |
| [Database Design](docs/DATABASE_DESIGN.md) | All 17 tables, relationship diagram, constraints |
| [API Design](docs/API_DESIGN.md) | Every endpoint with examples |
| [Subscription Model](docs/SUBSCRIPTION_MODEL.md) | Plans, payments, renewal, expiration |
| [Email Workflow](docs/EMAIL_WORKFLOW.md) | Email queue, worker, retries, email catalog |
| [Project Structure](docs/PROJECT_STRUCTURE.md) | Where code lives and naming conventions |
| [Deployment](docs/DEPLOYMENT.md) | Step-by-step: Render, Resend and the Asniher monitor |
