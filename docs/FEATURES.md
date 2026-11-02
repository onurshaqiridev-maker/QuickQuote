# Quick Quote — Features

This document lists **everything Quick Quote can do**, sorted by who uses it. It then describes **all 29 pages**, who may do what, and the main business rules. It ends with a checklist that maps each original requirement to the features that cover it.

---

## 1. How to read this document

Every feature has a short **ID** so other documents and tasks can refer to it:

| Prefix | Area |
|---|---|
| `P-` | Public pages and discovery (no login needed) |
| `AU-` | Authentication (accounts and login) |
| `C-` | Customer features |
| `B-` | Business features |
| `A-` | Administrator features |
| `S-` | System features (background work, health, security) |

---

## 2. Public and discovery features

| ID | Feature | Details |
|---|---|---|
| P-01 | Homepage | Hero section with a search box (name + city), category tiles, featured businesses, "How it works" for customers and businesses, and a call-to-action for businesses linking to Pricing |
| P-02 | Business directory | Lists all **active and published** businesses (see the [visibility rule](SUBSCRIPTION_MODEL.md#10-public-visibility-rule)) |
| P-03 | Search by name | Case-insensitive "name contains…" search |
| P-04 | Filter by category | Single category, chosen from active categories |
| P-05 | Filter by location | By city, chosen from cities that have visible businesses |
| P-06 | Sorting and pagination | Featured businesses first, then the most recently published. 12 per page. |
| P-07 | Public business profile | Logo, photos, name, description, address, contact details, categories, services with prices and durations, weekly working hours |
| P-08 | Start a reservation | A **Book** button on bookable services opens the booking panel (login required to confirm) |
| P-09 | Start a quote request | A **Request a quote** button on the profile and on each service (login required to submit) |
| P-10 | Pricing page | Shows the active subscription plans with prices, limits and features. **Get started** leads to business registration. |
| P-11 | About Us | What Quick Quote is, the mission, and how it works for both sides |
| P-12 | Contact form | Name, email, subject, message → a queued email to the admin |

---

## 3. Authentication features

| ID | Feature | Details |
|---|---|---|
| AU-01 | Customer registration | Name, email, password, optional phone. Logs in automatically. Sends the welcome + confirm-email message. |
| AU-02 | Business registration | Owner name, email, password, business name, city, time zone and 1–3 categories. Creates the account, the business (`pending_review`) and an unpublished profile. Notifies the admin. |
| AU-03 | Login | One login page for all roles. Afterwards: customers go to `/account`, business owners to `/dashboard`, admins to `/admin`. |
| AU-04 | Logout | Clears the session cookie |
| AU-05 | Email confirmation | One-time link (valid 48 hours) plus a "resend" option. Required before booking, requesting quotes or publishing. |
| AU-06 | Forgot / reset password | One-time link (valid 1 hour). Never reveals whether an email is registered. |
| AU-07 | Change password | In settings. Needs the current password. |
| AU-08 | Blocked accounts | Suspended or deactivated users cannot log in. Their current session stops working immediately. |

---

## 4. Customer features

Customers use everything for **free**.

| ID | Feature | Details |
|---|---|---|
| C-01 | Customer overview | Upcoming reservations, latest quote requests and their statuses, and a banner if the email is not confirmed |
| C-02 | Make a reservation | Select service → choose date → select a free time → add notes and phone → confirm. Saved as `pending`. |
| C-03 | Reservation history | All reservations with status, filterable: upcoming, past, cancelled |
| C-04 | Cancel a reservation | Allowed for `pending` and `confirmed` reservations until `cancellation_notice_hours` before the start |
| C-05 | Request a quotation | For a specific service, or a general request: subject, description, preferred date, budget, phone |
| C-06 | Quote request history | All requests with status. Shows the business's answer (price + message) when completed, and lets the customer **accept or decline** the quote. |
| C-07 | Profile and settings | Edit name and phone, change password |
| C-08 | Email notifications | Welcome, confirmation of each request, and every status change of their reservations and quotes |

---

## 5. Business features

| ID | Feature | Details |
|---|---|---|
| B-01 | Choose and pay for a plan | Starter, Professional or Premium. Mock checkout (development) or bank transfer (manual). |
| B-02 | Go-live checklist | On the overview: what is done and what is missing before the profile becomes public |
| B-03 | Edit business profile | Company name, description, public email and phone, website, address, city, postal code, country |
| B-04 | Logo | Upload or replace (JPEG/PNG/WebP, at most 5 MB) |
| B-05 | Photos | Upload, caption, reorder, delete. Limit set by the plan. |
| B-06 | Categories | Choose 1 to 3 categories |
| B-07 | Manage services | Add, edit or archive. Name, description, price type (fixed / from / on request), price, duration, "bookable online" switch, order. Limit set by the plan. |
| B-08 | Working hours | For each weekday: closed, or one or more time ranges (for example 09:00–12:00 and 13:00–18:00) |
| B-09 | Blocked times | Block holidays or breaks. No bookings possible during them. |
| B-10 | Booking settings | Time zone, slot interval (10–60 min), minimum notice, how far ahead customers can book, cancellation deadline |
| B-11 | Publish / unpublish | Make the profile public or hide it |
| B-12 | Reservation list | Pending, upcoming, past and all, grouped by day, with a date filter |
| B-13 | Manage reservations | Confirm, reject (with message), cancel (with message), mark as completed |
| B-14 | Customer information | Name, email, phone and earlier visits, for customers who booked or sent a quote request |
| B-15 | Manage quote requests | Start working on it, send a quote (message + optional price), decline (with message) |
| B-16 | Subscription management | Current plan, status, expiration date, usage against limits, renew, change plan (from the next period), cancel/resume, payment history |
| B-17 | Business overview | Today's appointments, pending reservations, new quote requests, subscription status and end date, checklist |
| B-18 | Account settings | Owner's name, phone and password |
| B-19 | Email notifications | New reservation, customer cancellation, new quote request, subscription and payment messages, approval/suspension |

---

## 6. Administrator features

| ID | Feature | Details |
|---|---|---|
| A-01 | Admin overview | Key numbers: customers, businesses by status, active subscriptions, monthly recurring revenue, reservations and quotes this week, businesses waiting for review, email queue health. Recent activity feed. |
| A-02 | List businesses | Search by name, filter by status |
| A-03 | Business details | Owner, profile, categories, services, subscription, payments, reservation and quote counts |
| A-04 | Approve / suspend / deactivate businesses | With a reason. Reactivate later. The owner is emailed. |
| A-05 | Manage customers | Search and filter users, see details and counts, suspend/reactivate |
| A-06 | View reservations | All reservations, filtered by status, business or date range |
| A-07 | View quote requests | All quote requests, filtered by status or business |
| A-08 | Manage subscription plans | Create, edit prices and limits, activate/deactivate (never delete). Postponed with phase 6 (free launch). |
| A-09 | Subscriptions and payments | View all subscriptions and payments. Mark bank transfers as paid or failed. Postponed with phase 6 (free launch). |
| A-10 | Manage categories | Create, edit, reorder, activate/deactivate, delete if unused |
| A-11 | Activity log | Timeline of important events, with who did them |
| A-12 | Email queue monitor | Pending and failed counts, the list of failed jobs with their errors, **Retry** button |

---

## 7. Pages

### 7.1 All pages at a glance

| # | Page | Route | Who | Main API calls |
|---|---|---|---|---|
| **Public** |||||
| 1 | Homepage | `/` | Everyone | `GET /api/categories`, `GET /api/cities`, `GET /api/businesses?featured=true` |
| 2 | Explore Businesses | `/explore` | Everyone | `GET /api/businesses`, `GET /api/categories`, `GET /api/cities` |
| 3 | Business Details / Public Profile | `/businesses/:slug` | Everyone | `GET /api/businesses/:slug`, `GET .../availability`, `POST /api/customer/reservations`, `POST /api/customer/quote-requests` |
| 4 | About Us | `/about` | Everyone | — |
| 5 | Contact | `/contact` | Everyone | `POST /api/contact` |
| 6 | Pricing / Subscription Plans | `/pricing` | Everyone | `GET /api/plans` |
| **Authentication** |||||
| 7 | Customer Registration | `/register` | Visitors | `POST /api/auth/register/customer` |
| 8 | Business Registration | `/register/business` | Visitors | `POST /api/auth/register/business`, `GET /api/categories` |
| 9 | Login | `/login` | Visitors | `POST /api/auth/login` |
| 10 | Forgot Password | `/forgot-password` (+ `/reset-password`) | Visitors | `POST /api/auth/forgot-password`, `POST /api/auth/reset-password` |
| **Customer dashboard** |||||
| 11 | Customer Overview | `/account` | Customer | `GET /api/customer/overview` |
| 12 | My Reservations | `/account/reservations` | Customer | `GET /api/customer/reservations`, `POST .../:id/cancel` |
| 13 | My Quote Requests | `/account/quotes` | Customer | `GET /api/customer/quote-requests` |
| 14 | Customer Profile / Settings | `/account/settings` | Customer | `PUT /api/account/profile`, `POST /api/account/change-password` |
| **Business dashboard** |||||
| 15 | Business Overview | `/dashboard` | Business | `GET /api/business/overview` |
| 16 | Edit Business Profile | `/dashboard/profile` | Business | `GET/PUT /api/business/profile`, logo, photos, categories, publish |
| 17 | Manage Services | `/dashboard/services` | Business | `GET/POST/PUT/DELETE /api/business/services` |
| 18 | Manage Working Hours | `/dashboard/hours` | Business | `GET/PUT /api/business/working-hours`, `/api/business/blocked-times` |
| 19 | Manage Reservations | `/dashboard/reservations` | Business | `GET /api/business/reservations`, confirm/reject/cancel/complete |
| 20 | Manage Quote Requests | `/dashboard/quotes` | Business | `GET /api/business/quote-requests`, start/respond/reject |
| 21 | Subscription Management | `/dashboard/subscription` (+ `/dashboard/subscription/checkout/:paymentId`) | Business | `/api/business/subscription/*`, `GET /api/business/payments` |
| 22 | Business Settings | `/dashboard/settings` | Business | `GET/PUT /api/business/settings`, `PUT /api/account/profile`, `POST /api/account/change-password` |
| **Administrator dashboard** |||||
| 23 | Admin Overview | `/admin` | Admin | `GET /api/admin/overview`, `GET /api/admin/email-jobs` |
| 24 | Manage Businesses | `/admin/businesses` | Admin | `/api/admin/businesses/*` |
| 25 | Manage Customers | `/admin/customers` | Admin | `/api/admin/users/*` |
| 26 | Manage Reservations | `/admin/reservations` | Admin | `GET /api/admin/reservations` |
| 27 | Manage Quote Requests | `/admin/quotes` | Admin | `GET /api/admin/quote-requests` |
| 28 | Manage Subscriptions | `/admin/subscriptions` | Admin | `/api/admin/subscriptions`, `/api/admin/payments`, `/api/admin/plans` |
| 29 | Manage Categories | `/admin/categories` | Admin | `/api/admin/categories/*` |

**Small helper pages** (part of the pages above, not separate features):

- `/reset-password`: part of page 10
- `/verify-email`: confirms an email from the link
- `/dashboard/subscription/checkout/:paymentId`: mock checkout, part of page 21
- A "Page not found" page

### 7.2 Public pages

**1. Homepage**
- **Shows:** a hero search box (business name + city dropdown), category tiles (icon + name), a "Featured businesses" row (Premium plan), "How it works" in three steps for customers, a "For businesses" section with a **See pricing** button, and a footer with links.
- **Actions:** search → Explore with filters. Click a category → Explore filtered by that category. Click a business → its profile.

**2. Explore Businesses**
- **Shows:** a filter bar (search text, category, city), result cards (logo, name, city, categories, "from €X", Featured badge), pagination and an empty state.
- **Actions:** change filters (saved in the URL), open a profile.

**3. Business Details / Public Profile**
- **Shows:**
  - a header (logo, name, city, categories, Featured badge) and a photo gallery,
  - the description and contact details (email, phone, website, address),
  - a **services list** (name, description, price, duration, a **Book** or **Request a quote** button),
  - the **working hours** table.
- **Booking panel** (step by step): service → date → time slot → notes + phone → review and confirm → success message.
- **Quote request form:** service (or "general request"), subject, description, preferred date, budget, phone → success message.
- **Rules:** shown only if the business is visible. Confirming needs a customer login with a confirmed email.

**4. About Us.** A static page: mission, how it works for customers and for businesses, and a short FAQ.

**5. Contact.** A form (name, email, subject, message) and a success message.

**6. Pricing / Subscription Plans.** Three plan cards (price, service limit, photo limit, featured), a feature comparison table, an FAQ (how billing works, can I cancel, what happens when it expires), and a **Get started** button that opens Business Registration with the plan pre-selected.

### 7.3 Authentication pages

**7. Customer Registration.** Name, email, password (with strength hint), optional phone, a terms checkbox. A link: "Are you a business? Register here."

**8. Business Registration.**
- **Step 1, Account:** owner name, email, password.
- **Step 2, Business:** business name, city, time zone (guessed from the browser), 1–3 categories.

Afterwards: the business dashboard, with the checklist.

**9. Login.** Email, password, "Forgot password?" link, sign-up links. Redirects by role.

**10. Forgot Password.** Email field → neutral success message. The **Reset Password** page (from the email link) has the new password, typed twice.

### 7.4 Customer dashboard

All customer pages share one layout with a side menu: Overview · Reservations · Quote requests · Settings.

**11. Customer Overview.** An email confirmation banner (if needed), the next 3 upcoming reservations, the 3 latest quote requests with status, and quick links: **Find a business**.

**12. My Reservations.** Tabs: Upcoming · Past · Cancelled/Rejected. Each item shows the business, service, date/time, status badge and price. Details include the business's message and a **Cancel** button (when allowed), or a "too late to cancel" note with the business's phone.

**13. My Quote Requests.** A list with business, subject, date sent and status badge. Details show the original request and, when completed, the **quoted price and message**.

**14. Customer Profile / Settings.** Name and phone form, change password form, and the email address (read-only in version 1).

### 7.5 Business dashboard

All business pages share one layout with a side menu: Overview · Profile · Services · Working hours · Reservations · Quote requests · Subscription · Settings. A top bar shows the subscription status and "Visible" / "Not visible" with the reason.

**15. Business Overview.** The go-live checklist (until live), today's appointments, pending reservations (needing action), new quote requests, the subscription card (plan, status, end date, **Renew**), and simple numbers (reservations this month, quotes this month).

**16. Edit Business Profile.**
- **Sections:** company info (name, description), contact (email, phone, website), location (address, city, postal code, country), logo upload, photo manager (upload, caption, drag to reorder, delete, "3 of 5 photos used"), categories (1–3).
- A **Publish / Unpublish** button with the list of missing requirements, and a **Preview public profile** link.

**17. Manage Services.**
- A table of services: name, price, duration, bookable, active, and "8 of 10 services used".
- **Add service** and **Edit service** open a form: name, description, price type, price, duration, bookable switch.
- Archive and restore buttons, and up/down arrows to change the order.

**18. Manage Working Hours.**
- **Weekly schedule:** Monday–Sunday, each "Closed" or one or more time ranges, with **Add range**.
- **Blocked times:** a list of upcoming blocks, plus **Add blocked time** (start, end, reason).

**19. Manage Reservations.** Tabs: Pending · Upcoming · Past · All, plus a date filter. The list is grouped by day. Details show customer information, notes and the action buttons (confirm, reject, cancel, complete).

**20. Manage Quote Requests.** Tabs: New · In progress · Answered · Declined. Details show the request, customer information, and the actions (start, send quote with price and message, decline).

**21. Subscription Management.**
- **Current plan card:** plan, price, status, period start/end, "cancels on …" or "switches to … on …".
- **Usage:** services X of Y, photos X of Y.
- **Actions:** choose a plan (when there is no subscription), renew, change plan, cancel, resume.
- **Payment history table.**
- Mock checkout page (development) or bank transfer instructions (manual).

**22. Business Settings.**
- **Booking settings:** time zone, slot interval, minimum notice (hours), book up to (days ahead), cancellation deadline (hours).
- **Account:** owner name, phone, change password.

### 7.6 Administrator dashboard

All admin pages share one layout with a side menu: Overview · Businesses · Customers · Reservations · Quote requests · Subscriptions · Categories.

**23. Admin Overview.** Number tiles (customers, businesses by status, active subscriptions, MRR, reservations this week, quotes this week), "Waiting for review" list, email queue card (pending, failed, oldest pending age, link to failed jobs with **Retry**), recent activity feed.

**24. Manage Businesses.** A table (name, owner, city, status, subscription status, created date) with search and status filter. Details show the profile, owner, subscription and payments, counts and checklist. Actions: approve, suspend, deactivate, reactivate (with a reason).

**25. Manage Customers.** A table (name, email, status, email confirmed, registered date, reservation count) with search and status filter. Details include counts. Actions: suspend and reactivate. A role filter can also show business owners and admins, which covers "view registered users".

**26. Manage Reservations.** A read-only table: business, customer, service, date/time, status. Filters: status, business, date range.

**27. Manage Quote Requests.** A read-only table: business, customer, subject, date, status. Filters: status, business.

**28. Manage Subscriptions.** Three tabs:
- **Subscriptions:** filter by status, open details with payments.
- **Payments:** filter by status, **Mark as paid** / **Mark as failed**.
- **Plans:** list, create, edit, activate/deactivate.

**29. Manage Categories.** A table (icon, name, slug, business count, active, order). Create, edit, reorder, activate/deactivate, and delete (only when unused).

---

## 8. System features

| ID | Feature | Details |
|---|---|---|
| S-01 | Email queue + worker | Every email goes through `email_jobs` and the worker, using Resend. Statuses `pending` / `sent` / `failed`. 1 try + 4 retries. See [EMAIL_WORKFLOW.md](EMAIL_WORKFLOW.md). |
| S-02 | Hourly maintenance | Subscription reminders and expirations, closing past reservations, daily cleanup |
| S-03 | Health check | `GET /health`: 200 when healthy, 503 when the database is unreachable |
| S-04 | Double-booking protection | A service check plus a PostgreSQL exclusion constraint |
| S-05 | Activity log | Important actions saved to `activity_logs` |
| S-06 | Security | Validation, rate limits, secure cookies, ownership checks, upload limits |
| S-07 | Migrations and seeds | Versioned SQL migrations, a base seed (categories, plans, admin) and a demo seed |
| S-08 | Configuration | Every setting comes from environment variables, checked at startup |

---

## 9. Permissions matrix

Yes = allowed · — = not allowed · "own" = only their own data

| Action | Visitor | Customer | Business owner | Admin |
|---|---|---|---|---|
| Browse, search and view public profiles | Yes | Yes | Yes | Yes |
| See plans and pricing, use the contact form | Yes | Yes | Yes | Yes |
| Register / log in | Yes | — | — | — |
| Change own name, phone, password | — | Yes | Yes | Yes |
| Book an appointment | — | Yes (email confirmed) | — | — |
| Cancel a reservation | — | own, before the deadline | own business's, any time | — |
| Send a quote request | — | Yes (email confirmed) | — | — |
| View reservations | — | own | own business's | all |
| Confirm / reject / complete reservations | — | — | own business's | — |
| View quote requests | — | own | own business's | all |
| Answer quote requests | — | — | own business's | — |
| See customer contact details | — | — | only customers who booked or requested a quote with them | all |
| Edit profile, services, hours, settings | — | — | own business | — |
| Publish / unpublish profile | — | — | own business | — |
| Subscribe, renew, change plan, cancel | — | — | own business | — |
| Approve / suspend / deactivate businesses | — | — | — | Yes |
| Suspend / reactivate users | — | — | — | Yes |
| Manage plans and categories | — | — | — | Yes |
| Mark payments paid or failed | — | — | — | Yes |
| View activity log and email queue, retry emails | — | — | — | Yes |

---

## 10. Business rules summary

### Reservations

1. Only **publicly visible** businesses accept reservations.
2. Only **active** services that are **bookable** and have a **duration** can be booked.
3. The slot must be **inside working hours**, on the business's **slot interval** (for example every 30 minutes), and must **not overlap** a pending or confirmed reservation or a blocked time.
4. The slot must be at least `min_notice_hours` from now and at most `max_advance_days` ahead.
5. The customer must have a **confirmed email**.
6. New reservations start as **`pending`**. The business confirms or rejects them.
7. Customers can cancel `pending` or `confirmed` reservations until `cancellation_notice_hours` before the start.
8. Businesses can cancel `pending` or `confirmed` reservations at any time, with an optional message.
9. A reservation can only be marked `completed` after its start time. Confirmed reservations are completed automatically 12 hours after they end.
10. Pending reservations nobody answered are cancelled automatically when their start time passes.
11. **One appointment at a time per business**: no overlapping active reservations.
12. Business-owner accounts cannot book. Owners use a separate customer account to book elsewhere.

### Quote requests

1. Only **publicly visible** businesses accept quote requests.
2. The customer must have a **confirmed email**.
3. The service is optional. If given, it must belong to that business.
4. Status flow: `pending` → `processing` (optional) → `completed` or `rejected`.
5. Sending a quote (`completed`) needs a **message**. The price is optional.

### Businesses and profiles

1. One business per business-owner account.
2. 1 to 3 categories.
3. **Publishing** needs: confirmed email, name + description + city, at least 1 category, at least 1 active service, and working hours if any service is bookable. When paid plans are switched on (`SUBSCRIPTIONS_REQUIRED=true`), also an active subscription.
4. **Visible** = published + approved by an admin + active owner account (+ an active or grace-period subscription once paid plans are on).
5. Service and photo limits come from the plan.
6. Services are archived, never deleted, so old reservations stay correct.

### Subscriptions

See [SUBSCRIPTION_MODEL.md](SUBSCRIPTION_MODEL.md).

---

## 11. Not in version 1

These are good ideas for later. They are left out to keep version 1 realistic:

- Reviews and star ratings
- Chat between customer and business
- Staff members and parallel appointments
- Map view and distance search
- Reminder emails and SMS
- Real card payments, automatic renewal, invoices, VAT
- Multiple languages and currencies
- Several businesses (branches) per owner account
- Account deletion (anonymization)
- Mobile apps

---

## 12. Requirements coverage checklist

This table maps every item of the original brief to where it is covered.

| Original requirement | Covered by |
|---|---|
| **Business account (paid):** register, choose plan, pay | AU-02, B-01 |
| Create and customize a public profile, logo, photos | B-03, B-04, B-05 |
| Company name, description, location | B-03 |
| Select categories | B-06 |
| Add services and prices | B-07 |
| Working hours and available booking times | B-08, B-09, B-10 |
| Receive quote requests and reservations | B-12, B-15, B-19 |
| Accept, reject, manage reservations | B-13 |
| View customer information | B-14 |
| Business dashboard | B-17, pages 15–22 |
| Manage subscription | B-16 |
| Own dashboard and public profile for each business | Pages 3, 15–22 |
| **Customer account (free):** register, log in | AU-01, AU-03 |
| Browse, search by name, category, location | P-02 to P-05 |
| View business info, services, prices | P-07 |
| Request a quotation | C-05 |
| Make reservations for a date and available time | C-02 |
| Receive email notifications | C-08 |
| Reservation and quote request history | C-03, C-06 |
| Cancel reservations when permitted | C-04 |
| **Administrator:** view users and businesses | A-02, A-03, A-05 |
| Approve, suspend, deactivate businesses | A-04 |
| Manage subscription plans | A-08, A-09 |
| View quote requests and reservations | A-06, A-07 |
| Monitor platform activity | A-01, A-11, A-12 |
| Manage categories | A-10 |
| **All 29 pages** | [Section 7](#7-pages) |
| **Discovery:** only active and published businesses shown | P-02, [visibility rule](SUBSCRIPTION_MODEL.md#10-public-visibility-rule) |
| **Reservation flow** (9 steps) and statuses | [USER_FLOWS.md → 4](USER_FLOWS.md#4-make-a-reservation) |
| Prevent double bookings, unavailable slots | S-04, [DATABASE_DESIGN.md → 6.1](DATABASE_DESIGN.md#61-no-double-bookings-the-most-important-rule) |
| **Quotation flow** (7 steps) and statuses | [USER_FLOWS.md → 7](USER_FLOWS.md#7-request-a-quotation) |
| **Subscriptions:** free customers, paid businesses, monthly plans, status, expiration, renewal, payment status | [SUBSCRIPTION_MODEL.md](SUBSCRIPTION_MODEL.md) |
| Simple initial pricing, separate from profile logic, no real payments yet | [SUBSCRIPTION_MODEL.md → 3, 8, 13](SUBSCRIPTION_MODEL.md#3-initial-pricing) |
| **Emails with Resend**, all listed notification types, queue + worker, never from endpoints | S-01, [EMAIL_WORKFLOW.md](EMAIL_WORKFLOW.md) |
| **Monolith with 4 layers**, SQL only in data, HTTP only in API | [ARCHITECTURE.md → 5](ARCHITECTURE.md#5-the-four-backend-layers) |
| PostgreSQL, migrations, seeds, settings from environment variables | S-07, S-08, [DATABASE_DESIGN.md → 10, 11](DATABASE_DESIGN.md#10-migrations-plan) |
| **Database entities and relationships** | [DATABASE_DESIGN.md](DATABASE_DESIGN.md) |
| **GET /health** with 200 / 503 | S-03, [ARCHITECTURE.md → 11](ARCHITECTURE.md#11-health-check-and-monitoring) |
| **Diagrams:** system, database, reservation, email queue | [ARCHITECTURE §2](ARCHITECTURE.md#2-system-architecture-diagram), [DATABASE_DESIGN §3](DATABASE_DESIGN.md#3-relationship-diagram), [USER_FLOWS §4](USER_FLOWS.md#4-make-a-reservation), [EMAIL_WORKFLOW §4](EMAIL_WORKFLOW.md#4-email-queue-workflow-diagram) |
