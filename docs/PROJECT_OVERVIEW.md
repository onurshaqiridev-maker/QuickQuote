# Quick Quote — Project Overview

> **Status:** Planning. This document and the eight others in `docs/` describe what we will build.
> No application code exists yet. Implementation starts after the plan is approved.

---

## 1. What is Quick Quote?

Quick Quote is a website where **customers find businesses** and **businesses get new clients**.

- A **business** pays a monthly subscription. This could be a hair salon, a plumber, a photographer, a car repair shop, and so on. In return it gets a public profile page showing its logo, photos, description, location, services and prices. Customers can send it **quotation requests** and **book appointments**.
- A **customer** uses the platform for free. They search for businesses, compare services and prices, ask for a quote, or book an appointment in a free time slot.
- A **platform administrator** runs the platform. They approve businesses, manage categories and subscription plans, and watch platform activity.

> **In simple terms:** Quick Quote is a business directory, a "request a quote" form and an appointment calendar in one place. Businesses pay a monthly fee to be listed.

---

## 2. The problem it solves

| For customers | For businesses |
|---|---|
| It is hard to find a good business nearby and compare prices. | It is hard to be found online without building your own website. |
| Calling around to ask for prices and free times takes a long time. | Answering calls and messages to schedule appointments takes a long time. |
| There is no single place to see your own bookings and requests. | Bookings arrive by phone, chat and email, and some get lost. |

Quick Quote puts **discovery, quotes and bookings in one place**.

---

## 3. Who uses it

| Role | Pays? | Main goal | Dashboard |
|---|---|---|---|
| **Customer** | Free | Find a business, request a quote, book an appointment | "My account" |
| **Business owner** | Monthly subscription | Get a public profile, receive quote requests and bookings | "Business dashboard" |
| **Administrator** | — | Keep the platform healthy and trustworthy | "Admin dashboard" |

[FEATURES.md](FEATURES.md) describes every feature for each role.

---

## 4. How the platform makes money

Only businesses pay. Each business picks one of three monthly plans: **Starter**, **Professional** or **Premium**. A business profile is only visible to the public while its subscription is active. Customers never pay.

Version 1 does **not** process real card payments. The subscription system works with two payment options:

1. a **mock (pretend) payment** for development and testing, and
2. a **manual bank transfer** that the administrator confirms in the admin dashboard.

Real card payments (for example with Stripe) can be added later without changing the rest of the system. [SUBSCRIPTION_MODEL.md](SUBSCRIPTION_MODEL.md) has the full details.

---

## 5. Main capabilities

1. **Business discovery.** A public directory where you can search by name and filter by category and city.
2. **Public business profiles.** Each shows a logo, photos, description, location, categories, services, prices and working hours.
3. **Reservations.** Customers book a free time slot. Businesses confirm, reject, cancel or complete it. Double bookings are impossible.
4. **Quotation requests.** Customers describe what they need. Businesses reply with a price and a message.
5. **Subscriptions.** Monthly plans with status tracking, expiration dates, renewal and payment history.
6. **Email notifications.** Sent in the background through a queue and a worker, using Resend.
7. **Three dashboards**, one each for customers, businesses and administrators.
8. **Health check.** `GET /health` for monitoring with Asniher.

---

## 6. Technology choices

We use **one programming language, TypeScript, everywhere**. That way you only need to learn one language for both the frontend and the backend.

| Part | Tool | Why we chose it |
|---|---|---|
| Frontend | **React + Vite + TypeScript** | The most popular way to build web interfaces, with lots of tutorials. Vite is fast and simple. |
| Frontend pages | **React Router** | The standard way to have many pages in one React app |
| Styling | **Tailwind CSS** | Build professional-looking pages quickly without writing large CSS files |
| Backend | **Node.js + Express + TypeScript** | Small, well known and easy to understand. Same language as the frontend. |
| Database | **PostgreSQL** | Reliable and free. It can enforce the rules we need, such as unique emails and no overlapping bookings. |
| Database access | **`pg` (node-postgres) with plain SQL** | You learn real SQL, and nothing is hidden behind "magic" |
| Migrations | **`node-pg-migrate`** | Database changes are saved as numbered files in Git |
| Validation | **Zod** | Describe the shape of incoming data once and get clear error messages |
| Password hashing | **bcrypt** (`bcryptjs` package) | The industry standard way to store passwords safely |
| Login sessions | **JWT in an httpOnly cookie** | Simple, and safe from JavaScript stealing the login |
| Time zones | **Luxon** | Correct appointment times, including daylight saving time changes |
| File uploads | **Multer + local disk** (cloud storage later) | Simple to start and easy to swap out later |
| Emails | **Resend** | A simple email API (requested) |
| Email queue | **A PostgreSQL table + a worker process** | No extra software to install or pay for (no Redis) |
| Logging | **pino** | Small and fast. Readable logs in development, structured logs in production. |
| Tests | **Vitest + Supertest** | Fast, simple test tools that work well with TypeScript |
| Local database | **Docker Compose** | Start PostgreSQL on your computer with one command |

---

## 7. Design principles

1. **Keep it small.** One backend codebase (a "monolith"), one database and one frontend. No microservices.
2. **Two processes, one codebase.** The backend runs in two ways:
   - an **API server** that answers web requests, and
   - an **email worker** that sends emails and runs scheduled checks.

   Both use the same code and the same database.
3. **Four clear backend layers:** API → Services → Data → Models. Each layer only calls the layer directly below it. See [ARCHITECTURE.md](ARCHITECTURE.md#5-the-four-backend-layers).
4. **The database protects the data.** PostgreSQL itself enforces the important rules (unique emails, no double bookings, only one active subscription), not just our code.
5. **Web requests stay fast.** Slow work, like sending emails, happens in the background.
6. **Settings come from environment variables.** No passwords or keys are written in the code.
7. **Build for change.** Payments and file storage sit behind small "provider" modules, so they can be replaced later without touching the rest.

---

## 8. Version 1 scope

**In version 1 (everything requested):**

- all 29 pages
- all three roles
- business discovery
- reservations and quotation requests
- subscriptions with mock and manual payments
- the email queue with Resend
- admin tools
- the health check

**Planned for later (not needed for launch):**

- Real card payments and automatic renewal (for example Stripe)
- Reviews and ratings
- Staff members, or several appointments at the same time per business
- Chat between customer and business
- Map view and "near me" search
- Appointment reminder emails and SMS messages
- Multiple languages
- Yearly plans, free trials, and invoices with VAT
- Better search engine visibility (server-side rendering of public pages)

---

## 9. Implementation roadmap

Each phase ends with something you can run and try. **Phases 1–3 build and deploy the backend core first.** They meet every point of the backend requirements ([section 10](#10-backend-requirements-checklist)) before any frontend work starts.

| Phase | Goal | What you will be able to see |
|---|---|---|
| 0 (done) | Planning documents | This `docs/` folder |
| 1 (done) | **Backend foundation** | The backend with its four layers (`api`, `services`, `data`, `models`) and the ESLint layer rules. PostgreSQL through Docker, settings from environment variables, migrations, the seed script, `GET /health` (200/503), `.env.example` and the README. |
| 2 (done) | **Email queue + accounts** | `email_jobs` table, the background worker, Resend sender, retries (1 try + 4 retries), and `pending` / `sent` / `failed` statuses. Registration, login, email confirmation, forgot password and the contact form all **enqueue** emails. |
| 3 (in progress) | **Deploy + monitor** ([guide](DEPLOYMENT.md)) | API, worker and PostgreSQL running online. An Asniher monitor on `/health`, its screenshot in the README, example `curl` requests. **Backend requirements complete.** |
| 4 (done) | Frontend foundation | React app with layouts, navigation, and the login and registration pages connected to the API |
| 5 (done) | Business profile | Edit profile, logo, photos, categories, services and prices, working hours and booking settings |
| 6 (postponed: free launch) | Subscriptions | Pricing page, choosing a plan, mock checkout, manual payments, admin approval, go-live checklist and publishing |
| 7 (done) | Discovery | Homepage, Explore page with search and filters, and public business profiles |
| 8 (done) | Reservations | Available time slots, booking, double-booking protection, and reservation pages for businesses and customers |
| 9 (done) | Quotations | Quote request form, business responses, and customer quote history |
| 10 (done; subscription pages wait for phase 6) | Admin dashboard | Overview, management pages, activity log and email queue monitor |
| 11 (done) | Launch preparation | About and Contact pages, frontend deployment, a [security review](SECURITY.md) and more tests |

---

## 10. Backend requirements checklist

How the plan meets each point of the backend requirements:

| # | Requirement | Points | How Quick Quote meets it | Details |
|---|---|---|---|---|
| 1 | **Architecture:** four layers (`api`, `services`, `data`, `models`). Each calls only the layer below. No SQL outside `data`, no HTTP outside `api`. | 25 | Folders `backend/src/api`, `services`, `data`, `models`. ESLint import rules make the linter fail if a file breaks the rules. Services throw domain errors, and only the API turns them into HTTP statuses. | [ARCHITECTURE.md §5](ARCHITECTURE.md#5-the-four-backend-layers), [PROJECT_STRUCTURE.md §2–3](PROJECT_STRUCTURE.md#2-backend-structure) |
| 2 | **Database:** PostgreSQL, migrations, seed script, connection settings from environment variables | 20 | SQL migrations with `node-pg-migrate`, `npm run seed`, `DATABASE_URL` / `DATABASE_SSL` / `DATABASE_POOL_MAX` read and checked in `config/env.ts` | [DATABASE_DESIGN.md §10–11](DATABASE_DESIGN.md#10-migrations-plan), [ARCHITECTURE.md §10](ARCHITECTURE.md#10-configuration-environment-variables) |
| 3 | **Email queue:** Resend. Endpoints only enqueue, and a worker sends. Status `pending` / `sent` / `failed` stored in the database. Failures retried at least 3 times. | 25 | Services call `EmailQueueService.enqueue()`, which inserts into `email_jobs` in the same transaction. `worker.ts` claims jobs with `FOR UPDATE SKIP LOCKED` and sends through Resend. 5 attempts = **4 retries** (1, 5, 15, 60 min). | [EMAIL_WORKFLOW.md](EMAIL_WORKFLOW.md) |
| 4 | **Health check:** `GET /health` → 200 with app and database status, 503 if the database is unreachable. Deployed and monitored on Asniher, with a screenshot. | 15 | `HealthService` + `HealthRepository` (`SELECT 1` with a 2-second timeout). Deployed in phase 3, Asniher HTTP monitor, screenshot saved in `docs/images/`. | [ARCHITECTURE.md §11, §15](ARCHITECTURE.md#11-health-check-and-monitoring) |
| 5 | **Delivery:** GitHub repo with a README (setup, env vars, architecture diagram, example requests), `.env.example` without real keys, clean commit history | 15 | README plan, `.env.example` with placeholders only, `.env` git-ignored, Conventional Commits with one change per commit | [PROJECT_STRUCTURE.md §10–12](PROJECT_STRUCTURE.md#10-environment-files-and-secrets) |

**Things only you can do** (I will prepare everything else and give you step-by-step instructions):

- Create a **Resend** account, verify a sending domain and create an API key.
- Create a **hosting** account (for example Render) for the API, worker and PostgreSQL, and paste the secrets into its settings.
- Create the **Asniher** monitor and take the screenshot.

---

## 11. Decisions to approve

These choices shape everything else. Please confirm or change them before implementation starts.

| # | Decision | Proposal |
|---|---|---|
| 1 | Tech stack | React + Vite + Tailwind for the frontend. Node.js + Express + TypeScript for the backend. PostgreSQL with plain SQL. |
| 2 | Pricing | Starter €19, Professional €39 and Premium €59 per month. The admin can change these. |
| 3 | Payments in version 1 | **Decided: free launch.** No payments at the start (`SUBSCRIPTIONS_REQUIRED=false`): businesses publish for free with the Starter limits. Paid plans (phase 6) come later. |
| 4 | Businesses per account | One business per business-owner account |
| 5 | Appointments | One appointment at a time per business (no staff or parallel bookings in version 1) |
| 6 | Admin approval | New businesses must be approved by an admin before they appear publicly |
| 7 | Email confirmation | Users must confirm their email address before they book, request quotes or publish a profile |
| 8 | Layer rule | Models are plain data shapes that every layer may import. Running logic ("calling") only goes one layer down. |
| 9 | Currency | Euro (EUR) for the whole platform in version 1 |
| 10 | Business owners booking | A business-owner account cannot book appointments. To book somewhere else, the owner uses a separate customer account. |
| 11 | Hosting | Render for the website, API, worker and PostgreSQL in one free web service plus a database (alternatives: Railway, Fly.io). The API server serves the built website, so both share one address (needed for the login cookie). |
| 12 | Build order | Backend core first (phases 1–3, meeting the backend requirements), then the frontend and the remaining features |

---

## 12. Glossary

| Word | Meaning |
|---|---|
| **API** | The part of the backend that receives requests from the frontend and sends back answers in JSON format |
| **Endpoint** | One address in the API, for example `GET /api/businesses` |
| **Frontend** | What runs in the browser: pages, buttons and forms |
| **Backend** | The program on the server: business rules, database access and emails |
| **Database** | Where all data is stored permanently (PostgreSQL) |
| **Migration** | A file that changes the database structure one step at a time, for example "create the users table" |
| **Seed script** | A script that fills the database with starting data: categories, plans, an admin user and demo data |
| **Repository** | A file in the data layer that holds all the SQL for one topic, for example reservations |
| **Entity** | A TypeScript type that matches one database table row |
| **DTO** | "Data Transfer Object". A plain object that carries data between layers. |
| **Queue** | A waiting list of jobs to do later, in order |
| **Worker** | A background program that takes jobs from the queue and does them |
| **Transaction** | A group of database changes that all succeed together or all fail together |
| **Slot** | A specific start time a customer can book, for example "Tuesday 10:30" |
| **Slug** | The readable part of a web address, for example `bella-hair-studio` in `/businesses/bella-hair-studio` |
| **Health check** | An endpoint that a monitoring tool calls to make sure the app is alive |
| **Environment variable** | A setting given to the program from outside, for example the database password |
| **JWT** | "JSON Web Token". A signed piece of text that proves who is logged in. |
| **Cents** | Money is stored as whole cents (€19.00 is stored as `1900`) to avoid rounding errors |

---

## 13. Document map

| Document | Read it when you want to know… |
|---|---|
| [FEATURES.md](FEATURES.md) | …what each user can do, and what is on each page |
| [USER_FLOWS.md](USER_FLOWS.md) | …the step-by-step journeys, including the reservation workflow diagram |
| [ARCHITECTURE.md](ARCHITECTURE.md) | …how the parts of the system talk to each other, and how the four layers work |
| [DATABASE_DESIGN.md](DATABASE_DESIGN.md) | …which tables exist, how they connect, and which rules protect the data |
| [API_DESIGN.md](API_DESIGN.md) | …every endpoint, with request and response examples |
| [SUBSCRIPTION_MODEL.md](SUBSCRIPTION_MODEL.md) | …how plans, payments, renewal and expiration work |
| [EMAIL_WORKFLOW.md](EMAIL_WORKFLOW.md) | …how emails are queued, sent, retried and monitored |
| [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) | …where each file goes, and how to add a new feature |
| [DEPLOYMENT.md](DEPLOYMENT.md) | …how to put the backend online on Render and monitor it with Asniher |
