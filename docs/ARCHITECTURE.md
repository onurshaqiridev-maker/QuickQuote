# Quick Quote — Architecture

This document explains **how Quick Quote is built**: its main parts, how they talk to each other, and how the backend code is organized into four layers.

---

## 1. The big picture

Quick Quote has five main parts:

1. **Frontend.** The React website that runs in the user's browser.
2. **API server.** The Node.js backend. It receives requests from the frontend, applies the business rules, and reads and writes the database.
3. **Email worker.** A second Node.js process that uses the same code. It runs in the background: it sends queued emails and does scheduled checks, such as expiring subscriptions.
4. **PostgreSQL.** The database where everything is stored. The email queue is also a table here.
5. **Resend.** The outside service that delivers our emails.

There are also two supporting parts: **file storage** for logos and photos, and **Asniher** for monitoring.

> **In simple terms:** The browser shows pages and talks to the API. The API is the only part that reads and writes the database for users. When an email must be sent, the API writes a "to-do note" into the database. The worker picks up the note and sends the email through Resend.

---

## 2. System architecture diagram

```mermaid
flowchart LR
    subgraph People["People using the website"]
        CU["Customer"]
        BO["Business owner"]
        AD["Administrator"]
    end

    subgraph Browser["Web browser"]
        FE["Frontend<br/>React single-page app"]
    end

    HOST["Static file host<br/>serves HTML, JS, CSS"]

    subgraph Backend["Backend: one Node.js codebase, two processes"]
        API["API server<br/>Express, src/server.ts"]
        WK["Email worker<br/>src/worker.ts"]
    end

    DB[("PostgreSQL<br/>all data + email_jobs queue")]
    FS[("File storage<br/>logos and photos")]
    RS["Resend<br/>email delivery service"]
    INBOX["Email inboxes<br/>customers and businesses"]
    MON["Asniher<br/>monitoring"]

    CU --> FE
    BO --> FE
    AD --> FE
    HOST -->|"1. downloads the app once"| FE
    FE -->|"2. HTTPS + JSON requests to /api"| API
    API -->|"3. SQL through repositories"| DB
    API -->|"4. saves uploaded images"| FS
    FE -.->|"loads images"| FS
    WK -->|"5. reads and updates email_jobs"| DB
    WK -->|"6. sends email over HTTPS"| RS
    RS -->|"7. delivers"| INBOX
    MON -->|"GET /health every minute"| API
```

**How to read it:** The solid arrows show who starts the conversation. Notice that **the API server and the worker never talk to each other directly**. They only share the database.

---

## 3. Building blocks

### 3.1 Frontend (React app)

- A single-page application built with React, Vite, TypeScript, React Router and Tailwind CSS.
- Built into static files (HTML, JavaScript, CSS) that any static file host can serve.
- Holds **no secrets** and makes **no security decisions**. Think of it as a remote control for the API. The API checks everything again.
- When it starts, it calls `GET /api/auth/me` to find out who is logged in.
- It has four areas: public pages, the customer account, the business dashboard and the admin dashboard. Dashboard pages are protected by role.

### 3.2 API server (`backend/src/server.ts`)

- An Express application. It offers JSON endpoints under `/api/...`, plus `GET /health`.
- Its code is organized in **four layers** ([section 5](#5-the-four-backend-layers)).
- It is **stateless**: it remembers nothing between requests except what is in the database. This means we can run more copies of it later if traffic grows.

### 3.3 Email worker (`backend/src/worker.ts`)

- Same codebase as the API server, started with a different command.
- It has two jobs:
  1. **Email loop.** Every 5 seconds it takes pending email jobs from the database and sends them through Resend.
  2. **Maintenance tasks.** Every hour it sends subscription reminders, expires subscriptions, closes past reservations and cleans up old data.
- It has **no web endpoints**. It only talks to PostgreSQL and Resend.

### 3.4 PostgreSQL

- One database for everything: users, businesses, reservations, quotes, subscriptions, payments and email jobs.
- Enforces important rules with constraints. See [DATABASE_DESIGN.md](DATABASE_DESIGN.md).
- The API server and the worker both connect through a **connection pool**, a small set of reusable connections. The settings come from the `DATABASE_URL` environment variable.

### 3.5 File storage

- Stores logos and photos uploaded by businesses.
- **In development:** saved in `backend/uploads/` and served at `/uploads/...`.
- **In production:** S3-compatible storage (such as Amazon S3 or Cloudflare R2). Many hosting platforms delete local files every time you deploy, so local disk is not safe there.
- Only `StorageService` knows where files go, so switching storage means changing one file.
- The database only stores the file's **URL**, never the image itself.

### 3.6 Resend

- The outside service that delivers our emails.
- **Only the worker** talks to Resend, using the `RESEND_API_KEY` secret.

### 3.7 Asniher (monitoring)

- Calls `GET /health` regularly and sends an alert if the answer is not HTTP 200.

---

## 4. How the parts communicate

### 4.1 Who talks to whom

| From | To | How | What is exchanged |
|---|---|---|---|
| Browser | Static file host | HTTPS | Downloads the React app once (HTML, JS, CSS) |
| Frontend (running in the browser) | API server | HTTPS, JSON, `fetch()` | Requests such as "list businesses" or "create reservation", answered in JSON. The login cookie is sent automatically. |
| Browser | File storage (or `/uploads` on the API) | HTTPS | Logo and photo images |
| API server | PostgreSQL | Connection pool (`pg` library) | SQL queries, sent **only from the data layer** |
| API server | File storage | Local disk or the S3 API | Saving uploaded images |
| Email worker | PostgreSQL | Connection pool (`pg` library) | Reads and updates `email_jobs`, subscriptions and reservations |
| Email worker | Resend | HTTPS (Resend SDK) | "Please send this email" |
| Resend | Email inboxes | Email | The actual emails |
| Asniher | API server | HTTPS `GET /health` | Health status (200 or 503) |

### 4.2 Communication rules

1. The **frontend only talks to the API**. Never to the database, the worker or Resend.
2. The **API server never talks to Resend**. It only creates email jobs in the database.
3. The **API server and the worker never call each other**. The `email_jobs` table is their shared mailbox.
4. **Only the data layer sends SQL** to the database.
5. **Secrets stay on the server**, in environment variables. This includes the database password, the Resend key and the JWT secret.

### 4.3 Example: a customer books an appointment

1. The customer opens `/businesses/bella-hair-studio`. The frontend calls `GET /api/businesses/bella-hair-studio`. The API reads the profile, services and working hours from PostgreSQL and returns JSON. The frontend shows the page.
2. The customer picks "Haircut" and a date. The frontend calls `GET /api/businesses/bella-hair-studio/availability?serviceId=...&date=2026-11-10`. The API works out the free time slots and returns them.
3. The customer picks 10:30, writes a note and clicks **Confirm**. The frontend sends `POST /api/customer/reservations`. The browser includes the login cookie automatically.
4. The API checks who is logged in and validates the data. Then it asks `ReservationService` to create the reservation.
5. `ReservationService` opens a **database transaction**. Inside it, the service:
   - checks that the slot is still free,
   - saves the reservation with status `pending`,
   - adds **two email jobs**: one for the business and one for the customer,
   - commits the transaction, so all of this is saved together.
6. The API answers `201 Created` within milliseconds. The customer sees "Request sent!".
7. Within a few seconds the worker finds the two new email jobs. It sends them through Resend and marks them as `sent`.
8. The business owner receives the email, opens the dashboard and clicks **Confirm**. The API changes the reservation to `confirmed` and queues a confirmation email for the customer. The worker sends it.

### 4.4 A simple comparison

Think of a restaurant:

- The **frontend** is the menu and the table where guests place their orders.
- The **API server** is the waiter. They take orders, check that they make sense and write them down.
- The **database** is the order book. Everything that is written down lives there.
- The **email worker** is the delivery driver. Every few seconds they check the "to deliver" pile.
- **Resend** is the postal service.

The waiter never leaves the restaurant to deliver letters. They put the letters on the pile and keep serving guests. **That is why the website stays fast** even when many emails need to go out.

---

## 5. The four backend layers

The backend code is split into exactly **four layers**. Each layer has one job.

### 5.1 Layer diagram

```mermaid
flowchart TD
    REQ(["HTTP request from the frontend"]) --> R
    TIMER(["Timer in the worker"]) --> WE

    subgraph L1["1. API layer: src/api"]
        R["Routes<br/>which URL goes where"] --> MW["Middleware<br/>login check, role check, validation"]
        MW --> C["Controllers<br/>read the request, send the response"]
    end

    WE["worker.ts<br/>entry point, no HTTP"]

    subgraph L2["2. Services layer: src/services"]
        S["Business rules<br/>auth, reservations, quotes,<br/>subscriptions, email job creation"]
    end

    subgraph L3["3. Data layer: src/data"]
        D["Repositories<br/>all SQL lives here"]
    end

    subgraph L4["4. Models layer: src/models"]
        M["Entities, DTOs, request models,<br/>response models, enums, errors"]
    end

    PG[("PostgreSQL")]

    C -->|calls| S
    WE -->|calls| S
    S -->|calls| D
    D -->|SQL| PG

    C -.->|uses shapes from| M
    S -.->|uses shapes from| M
    D -.->|uses shapes from| M
```

### 5.2 What each layer does

| Layer | Folder | Contains | Allowed to | Not allowed to |
|---|---|---|---|---|
| **API** | `src/api` | Routes, controllers and middleware (login check, role check, validation, uploads, error handler) | Read HTTP requests, validate input, call services, send HTTP responses | Write SQL or contain business rules |
| **Services** | `src/services` | Business logic: authentication, reservations, availability, quotes, subscriptions, payments, email job creation | Apply rules, call repositories, start transactions | See `req`/`res`, use HTTP status codes or cookies, write SQL |
| **Data** | `src/data` | Database connection pool, transaction helper and repositories | Run SQL and turn database rows into entities | Contain business rules or know about HTTP |
| **Models** | `src/models` | Entities, DTOs, request models (Zod schemas), response models, enums, domain errors | Describe the shape of data | Import from other layers or do any input/output |

### 5.3 The rules

1. **The API calls only Services. Services call only Data. Data talks only to PostgreSQL.**
2. **Models is the foundation.** It only contains data shapes. Nothing in it "does" anything, so it is safe for every layer to import its types and schemas. Models imports nothing from the other layers.
3. **No SQL outside the data layer.**
4. **No HTTP outside the API layer.** Services never see `req`, `res`, status codes or cookies.
5. **No skipping layers.** A controller may never call a repository directly.

Besides the layers there are two kinds of **supporting files**. They are not layers and contain no business logic:

- `src/config/` reads environment variables and sets up the logger.
- `src/server.ts` and `src/worker.ts` are the two **entry points**. They wire things together and start the program.

**Where does the worker fit?** `worker.ts` is an entry point just like the API layer, except a **timer** triggers it instead of an HTTP request. It calls services (`EmailWorkerService`, `MaintenanceService`) and never calls repositories directly. So the layer rules apply to the worker as well.

### 5.4 Example: "a business confirms a reservation", layer by layer

1. **API layer.**
   - The route `POST /api/business/reservations/:id/confirm` runs three middleware functions:
     - `authenticate` finds out who is calling,
     - `requireRole('business_owner')` checks their role,
     - `loadBusiness` finds which business they own.
   - The controller reads the `id` from the URL and calls `reservationService.confirm({ businessId, reservationId })`.
2. **Services layer.**
   - `ReservationService` loads the reservation through the repository and checks that it belongs to this business.
   - It checks that the status is `pending`. If not, it throws an `INVALID_STATUS_TRANSITION` error.
   - In one transaction it updates the status to `confirmed`, creates an email job for the customer and records an activity log entry.
3. **Data layer.**
   - `ReservationRepository` runs an `UPDATE reservations ... WHERE id = $1 AND business_id = $2 AND status = 'pending'` query.
   - `EmailJobRepository` runs an `INSERT INTO email_jobs ...` query.
4. **Models layer.** Every layer shares the `Reservation` entity, the `ReservationStatus` values and the `ReservationResponse` shape.
5. **Back in the API layer**, the controller sends `200 OK` with the updated reservation as JSON.

### 5.5 How errors travel through the layers

- **Services** throw **domain errors** defined in `src/models/errors.ts`, for example `NotFoundError`, `ForbiddenError` or `ConflictError('SLOT_UNAVAILABLE')`. Each has a **code** and a friendly message, and **no HTTP status**.
- The **data layer** turns specific PostgreSQL errors into domain errors. For example:
  - a "unique violation" on `users.email` becomes `EMAIL_TAKEN`,
  - an "exclusion violation" on reservations becomes `SLOT_UNAVAILABLE`.
- The API layer's **error-handler middleware** turns each code into an HTTP status (see the table in [API_DESIGN.md](API_DESIGN.md#3-status-codes-and-error-codes)) and formats the JSON error. Unknown errors become `500 Internal Server Error` with a general message. The details only go to the server logs.

### 5.6 Transactions across several tables

Some actions change several tables at once and must be **all-or-nothing**. Creating a reservation, for example, also creates email jobs. The data layer offers a helper called `withTransaction(callback)`. It works like this:

- A service calls the helper and receives a transaction "client".
- The service passes that client to each repository function it uses.
- If any step fails, **everything is undone**.

The service never writes `BEGIN` or `COMMIT` itself, because that is SQL and belongs in the data layer.

### 5.7 How the rules are enforced

- **ESLint `no-restricted-imports` rules per folder.** For example, files in `src/api/**` may not import from `src/data/**`, and files in `src/services/**` may not import `express`. If someone breaks a rule, the linter shows an error.
- A short **review checklist** for each change: "Is there SQL outside `src/data`? Is there `req`/`res` outside `src/api`?"

---

## 6. Authentication and authorization

**Authentication** = "Who are you?" **Authorization** = "Are you allowed to do this?"

### 6.1 Logging in

1. The user sends their email and password to `POST /api/auth/login`.
2. `AuthService` finds the user by email and compares the password with the stored **bcrypt hash**.
3. If the password is correct and the account is active, it creates a **JWT**. The token contains the user ID and role, is signed with `JWT_SECRET`, and is valid for 7 days.
4. The API puts the JWT in a cookie called `qq_session` with these settings:
   - `HttpOnly`: JavaScript cannot read it, so a malicious script cannot steal it.
   - `Secure`: only sent over HTTPS (in production).
   - `SameSite=Lax`: not sent along when other websites submit forms to us.
   - Expires after 7 days.
5. The browser sends this cookie automatically with every API request.
6. To log out, the API clears the cookie.

### 6.2 On every request

| Middleware | What it does |
|---|---|
| `authenticate` | Reads the cookie and checks the signature and expiry. Loads the user from the database, so a suspended user is blocked immediately. Attaches the user to the request as `req.user`. |
| `requireRole(...)` | Checks that the user has the right role, for example `business_owner` |
| `loadBusiness` | For business routes: finds the business owned by this user and attaches `req.businessId` |
| `requireVerifiedEmail` | For booking and quote requests: checks that the user has confirmed their email |

### 6.3 Ownership checks

- Services always receive the **ID of the person acting** (`customerId` or `businessId`), and every query filters by it. For example: `WHERE id = $1 AND business_id = $2`. A business can **never** see another business's reservations, even if it guesses an ID.
- A business can only see the contact details (name, email, phone) of customers who booked with it or sent it a quote request.

### 6.4 Passwords and one-time tokens

- Passwords are hashed with **bcrypt (cost 12)**. They must be 8 to 72 characters long (72 is bcrypt's limit).
- Email confirmation and password reset use random one-time **tokens** (32 random bytes). The rules for these tokens:
  - Only a **SHA-256 hash** of each token is stored. If the database leaked, the tokens could not be used.
  - Reset tokens expire after **1 hour**. Email confirmation tokens expire after **48 hours**.
  - Each token works only once.
- "Forgot password" always answers *"If an account exists for this email, we sent a reset link"*. It never reveals whether an email address is registered.

### 6.5 Permissions

[FEATURES.md → Permissions matrix](FEATURES.md#9-permissions-matrix) has the full table of who can do what.

---

## 7. Background processing (the worker)

| Task | How often | What it does |
|---|---|---|
| **Send emails** | Every 5 seconds | Claims up to 10 due `pending` email jobs and sends them through Resend. Each is marked `sent`, scheduled for a retry, or marked `failed` after the last attempt (1 try + 4 retries). If the worker crashes while sending, the job's lock expires after 10 minutes and it is picked up again. |
| **Subscription check** | Every hour | Sends reminders 7 days and 1 day before a subscription ends. At the end of a period: `active` → `past_due`, or `cancelled` if the business asked to cancel. After a 3-day grace period: `past_due` → `expired`. |
| **Reservation cleanup** | Every hour | Confirmed reservations that ended more than 12 hours ago become `completed`. Pending reservations whose start time has passed become `cancelled`, and the customer is told. |
| **Data cleanup** | Once a day | Deletes expired one-time tokens, and sent email jobs older than 90 days |

**Why not a separate scheduling tool?** Simple timers inside the worker are enough. If we ever run two workers at once:

- **Emails stay safe**, because claiming uses `FOR UPDATE SKIP LOCKED` (see [EMAIL_WORKFLOW.md](EMAIL_WORKFLOW.md#6-the-worker-loop-step-by-step)).
- **Maintenance tasks run only once at a time**, because each run takes a PostgreSQL "advisory lock" first.

More details: [EMAIL_WORKFLOW.md](EMAIL_WORKFLOW.md) and [SUBSCRIPTION_MODEL.md](SUBSCRIPTION_MODEL.md#11-automatic-checks).

---

## 8. File uploads

1. `POST /api/business/profile/logo` and `POST /api/business/photos` accept `multipart/form-data`. This is the normal format browsers use to upload files.
2. **Multer** (API layer) receives the file and checks two things:
   - the size is **at most 5 MB**,
   - the type is **JPEG, PNG or WebP**.
3. `ProfileService` checks the plan's **photo limit**.
4. `StorageService` saves the file under a random name, such as `businesses/<businessId>/<random-id>.webp`, and returns its URL.
5. The repository saves the URL in the database.
6. Deleting a photo removes both the database row and the file.

---

## 9. Time and time zones

Appointment times are a classic source of bugs. These rules keep them correct:

- **Each business has a time zone**, for example `Europe/Berlin`.
- **Working hours are stored as local times**, for example 09:00–17:00. "Local" means "in the business's time zone".
- **Reservations are stored as exact moments in time** (PostgreSQL `timestamptz`, saved in UTC).
- **The API always sends and receives times as ISO 8601 UTC strings**, such as `2026-11-10T09:30:00.000Z`. Business responses include the `timezone`, so the frontend can show times in the business's local time.
- **Luxon** converts between local working hours and exact moments, and handles daylight saving time changes correctly.

---

## 10. Configuration (environment variables)

All settings come from environment variables. When the backend starts, `src/config/env.ts` reads and checks them with Zod. If a required setting is missing, the program stops with a clear message, such as *"DATABASE_URL is missing"*.

A file called `.env.example` (committed to Git) lists every variable. Each developer copies it to `.env` (never committed) and fills in their own values.

### Backend variables

| Variable | Example | Used by | Meaning |
|---|---|---|---|
| `NODE_ENV` | `development` | both | `development`, `test` or `production` |
| `PORT` | `4000` | API | The port the API server listens on |
| `DATABASE_URL` | `postgres://quickquote:secret@localhost:5432/quickquote` | both | The full PostgreSQL connection address (user, password, host, port, database) |
| `DATABASE_SSL` | `false` | both | `true` when the database provider requires an encrypted connection |
| `DATABASE_POOL_MAX` | `10` | both | Maximum number of database connections in the pool |
| `JWT_SECRET` | *(a long random string)* | API | Used to sign login tokens. Must be secret. |
| `JWT_EXPIRES_IN` | `7d` | API | How long a login lasts |
| `FRONTEND_URL` | `http://localhost:5173` | both | The website address. Used for CORS and for links inside emails. |
| `API_PUBLIC_URL` | `http://localhost:4000` | API | The public API address. Used for links to uploaded files. |
| `EMAIL_DRIVER` | `console` | worker | `console` prints emails in the terminal (development). `resend` really sends them. |
| `RESEND_API_KEY` | `re_...` | worker | Resend API key (only needed when `EMAIL_DRIVER=resend`) |
| `EMAIL_FROM` | `Quick Quote <noreply@quickquote.example>` | worker | The sender shown in emails |
| `ADMIN_NOTIFICATION_EMAIL` | `admin@quickquote.example` | API | Receives contact form messages and "new business registered" notices |
| `EMAIL_POLL_INTERVAL_MS` | `5000` | worker | How often the worker checks for new email jobs |
| `EMAIL_BATCH_SIZE` | `10` | worker | How many jobs the worker claims at once |
| `EMAIL_MAX_ATTEMPTS` | `5` | API | Attempts per email before it is marked `failed` (1 try + 4 retries). Must be at least 4 (that is, at least 3 retries). |
| `EMAIL_SEND_TIMEOUT_MS` | `10000` | worker | How long to wait for Resend before counting the attempt as failed |
| `EMAIL_LOCK_TIMEOUT_MINUTES` | `10` | worker | After this time, a claimed but unfinished job can be claimed again |
| `PAYMENT_PROVIDER` | `mock` | API | `mock` or `manual` (`stripe` later) |
| `MANUAL_PAYMENT_INSTRUCTIONS` | `Bank: ..., IBAN: ...` | API | Bank transfer details shown to businesses when `PAYMENT_PROVIDER=manual` |
| `STORAGE_DRIVER` | `local` | API | `local` (`s3` later) |
| `UPLOAD_DIR` | `./uploads` | API | Folder for uploaded files when `STORAGE_DRIVER=local` |
| `HEALTH_DB_TIMEOUT_MS` | `2000` | API | Maximum time the health check waits for the database |
| `SEED_ADMIN_EMAIL` | `admin@quickquote.example` | seed script | Email for the first admin account |
| `SEED_ADMIN_PASSWORD` | *(secret)* | seed script | Password for the first admin account |

### Frontend variables

| Variable | Example | Meaning |
|---|---|---|
| `VITE_API_URL` | *(empty in development)* | The API address. In development it is empty, because Vite forwards `/api` requests to `http://localhost:4000`. |

---

## 11. Health check and monitoring

### 11.1 The `GET /health` endpoint

The health check follows the same four layers as everything else:

```
health.routes.ts  →  health.controller.ts  →  HealthService.check()  →  HealthRepository.ping()  →  SELECT 1
     (API)                 (API)                  (Services)                  (Data)
```

- `HealthRepository.ping()` runs `SELECT 1` against PostgreSQL. It gives up after `HEALTH_DB_TIMEOUT_MS` (2 seconds).
- `HealthService.check()` returns `{ app: "ok", database: "ok" }` or `{ app: "ok", database: "unreachable" }`.
- The controller turns this into an HTTP response:

**Healthy, HTTP 200:**

```json
{
  "status": "ok",
  "checks": { "app": "ok", "database": "ok" },
  "uptimeSeconds": 86400,
  "timestamp": "2026-11-01T12:00:00.000Z"
}
```

**Database unreachable, HTTP 503:**

```json
{
  "status": "error",
  "checks": { "app": "ok", "database": "unreachable" },
  "uptimeSeconds": 86400,
  "timestamp": "2026-11-01T12:00:00.000Z"
}
```

Rules for the endpoint:

- No login required.
- No secrets or internal details in the response.
- `Cache-Control: no-store`, so it is never cached.
- Fast, because of the 2-second database timeout.
- Not rate-limited.

### 11.2 Monitoring with Asniher

The endpoint only relies on the HTTP status code (200 or 503), so it works with any HTTP monitoring tool, including Asniher. Suggested setup:

- **URL:** `https://api.<your-domain>/health`
- **Check every:** 1 minute
- **Alert when:** the status is not 200, or there is no answer within 5 seconds

### 11.3 Watching the worker

The worker has no web endpoint, so we watch it in other ways:

- It writes a log line for every email batch.
- The admin dashboard shows the number of **pending** and **failed** email jobs. If the pending count keeps growing, the worker is probably down.
- *Later:* the worker can write a "heartbeat" time to the database every minute, so the admin dashboard can show "worker last seen 30 seconds ago".

---

## 12. Security checklist

| Area | Measure |
|---|---|
| Transport | HTTPS everywhere in production |
| HTTP headers | `helmet` middleware sets secure browser headers |
| CORS | Only `FRONTEND_URL` may call the API from a browser, with credentials (cookies) allowed |
| Input | Every request body, query and URL parameter is validated with Zod |
| SQL injection | Only parameterized queries (`$1`, `$2`, …). Never build SQL by joining strings together. |
| XSS (malicious scripts) | React escapes text automatically. Never use `dangerouslySetInnerHTML` with user content. |
| Login | bcrypt password hashes. httpOnly, Secure, SameSite cookies. |
| One-time tokens | Random, hashed in the database, they expire, and each works only once |
| Account privacy | Never reveal whether an email address is registered |
| Ownership | Every query for private data filters by the owner's ID |
| Rate limiting | Limits on login, registration, forgot password, contact form, reservations and quote requests (see [API_DESIGN.md](API_DESIGN.md#9-rate-limits)) |
| Uploads | Images only, 5 MB maximum, random file names |
| Secrets | Only in environment variables. `.env` is never committed. |
| Errors | Users see friendly messages. Technical details only go to server logs. |
| Hosting | Put the API on a subdomain of the same domain (`api.quickquote.com` next to `quickquote.com`), so `SameSite=Lax` cookies work |

---

## 13. Logging

- **pino** logger: pretty, readable output in development and JSON lines in production.
- Every request is logged with its method, path, status code and duration. **Passwords, tokens and cookies are never logged.**
- The worker logs the result of each email job, for example *sent*, *retry in 5 minutes* or *failed*.
- Unexpected errors are logged with their full stack trace, on the server only.

---

## 14. Testing strategy

| Type | What we test | Tools |
|---|---|---|
| **Unit tests** | Service rules: slot calculation, status changes, subscription dates, plan limits, cancellation windows | Vitest, with fake repositories |
| **Integration tests** | Repositories and migrations against a real test database. API endpoints from request to response. | Vitest + Supertest + a test PostgreSQL database |
| **Manual testing** | Clicking through the main user flows with the demo seed data | Browser |

**The most important tests:**

- double-booking protection, including two requests at the same moment
- slot calculation around daylight saving time changes
- ownership checks (business A cannot see business B's data)
- subscription expiration and renewal dates

---

## 15. Deployment and monitoring plan

The step-by-step guide is in [DEPLOYMENT.md](DEPLOYMENT.md). The backend is deployed **early**, right after the email queue works (phase 3 of the [roadmap](PROJECT_OVERVIEW.md#9-implementation-roadmap)). That way the health check is monitored by Asniher from the start, not only at the end.

### 15.1 Where things run

| Part | Where it runs | Notes |
|---|---|---|
| Backend: API server | A Node.js host, as a web service running `npm run start` | Proposal: **Render**. Alternatives: Railway, Fly.io or a small virtual server. |
| Backend: email worker | The same host, as a **background worker** running `npm run start:worker` | If the hosting plan has no separate background worker, use **one** web service running `npm run start:all` (API + worker in one process) |
| PostgreSQL | A managed PostgreSQL database from the same host | Its connection string goes into `DATABASE_URL` |
| Frontend | Static hosting, for example Netlify or Vercel | Only needed once the frontend exists |
| Files | S3-compatible object storage | Only needed once photo uploads exist |
| Monitoring | Asniher checks `https://<api-host>/health` | — |

> **Why not Vercel or Netlify for the backend?** They are great for the static frontend. But the email worker must run **all the time** in the background, and those platforms are built for short-lived functions, not long-running processes.

### 15.2 Deploying

1. Push the code to GitHub.
2. Create the PostgreSQL database on the host and copy its connection string.
3. Create the API service (build: `npm ci && npm run build`, start: `npm run start`) and the worker (start: `npm run start:worker`).
4. Set the environment variables in the host's dashboard. Never put them in Git. The important ones: `DATABASE_URL`, `DATABASE_SSL=true`, `JWT_SECRET`, `EMAIL_DRIVER=resend`, `RESEND_API_KEY`, `EMAIL_FROM`, `FRONTEND_URL`.
5. Apply migrations and the seed on each deploy, before the app starts. In our `render.yaml` this is part of the start command: `npm run migrate:deploy && npm run seed:deploy && exec node dist/src/all.js`.
6. Open `https://<api-host>/health` and check that it returns `200`.

### 15.3 Monitoring with Asniher

1. Create an HTTP monitor in Asniher for `https://<api-host>/health`. Check every minute, and alert when the status is not 200 or there is no answer within 5 seconds.
2. Test the alert once. For example, set a wrong `DATABASE_URL` for a minute, check that `/health` returns `503` and that Asniher alerts, then restore the setting.
3. Take a **screenshot of the monitor** showing it "up". Save it as `docs/images/asniher-monitor.png` and show it in the README.

## 16. Key decisions and why

| Decision | Choice | Why | Alternative we did not choose |
|---|---|---|---|
| Overall shape | One monolith, two processes | Simple to build, run, debug and deploy | Microservices (much more complex) |
| Email queue | A PostgreSQL table | No extra software. Jobs are saved in the same transaction as the data that caused them. | Redis + BullMQ (one more service to run) |
| Database access | Plain SQL with `pg` | You learn real SQL. Nothing hidden. | An ORM like Prisma (hides the SQL, another tool to learn) |
| Login | JWT in an httpOnly cookie | Simple and safe from script-based token theft | Tokens in `localStorage` (can be stolen by malicious scripts) |
| Double bookings | Database exclusion constraint **plus** a service check | Guaranteed safe even when two people click at the same moment | Only a check in code (two simultaneous requests could both pass) |
| Status columns | `text` + `CHECK` constraint | Easy to change later in a migration | PostgreSQL `ENUM` types (harder to change) |
| IDs | UUIDs | Cannot be guessed, safe in URLs | Auto-increment numbers (1, 2, 3… are easy to guess) |
| Payments | Provider module: mock + manual now | No real money moves until the plan is approved | Stripe from day one |
| Frontend | React single-page app (Vite) | Easiest to learn. Keeps the frontend and backend clearly separate. | Next.js (mixes frontend and backend, which conflicts with the four-layer backend) |
