# Quick Quote — API Design

This document describes every endpoint of the backend API: what it does, who may call it, what it accepts and what it returns.

> **In simple terms:** The frontend never touches the database. To do anything, it sends a request to an **endpoint**, such as `GET /api/businesses`, and receives an answer in **JSON**. JSON is a simple text format for data. This document is the "menu" of everything the frontend can ask for.

---

## 1. Basics

| Topic | Rule |
|---|---|
| **Base URL** | `/api` for all application endpoints. `GET /health` sits outside `/api`. |
| **Format** | Requests and responses use JSON (`Content-Type: application/json`). File uploads use `multipart/form-data`. |
| **Field names** | `camelCase` in JSON (`startsAt`). The database uses `snake_case` (`starts_at`), and the data layer converts between them. |
| **Login** | A cookie called `qq_session` (httpOnly). The frontend sends requests with `credentials: 'include'`, and the browser adds the cookie automatically. |
| **Dates and times** | ISO 8601 in UTC, for example `2026-11-10T09:30:00.000Z`. Date-only values use `YYYY-MM-DD` and mean "in the business's time zone". |
| **Money** | Whole cents as integers: `priceCents: 2500` means €25.00 |
| **IDs** | UUID strings |
| **Methods** | `GET` = read · `POST` = create or perform an action · `PUT` = replace or update · `DELETE` = remove or archive |
| **Actions** | Status changes use clear action endpoints, for example `POST /reservations/:id/confirm`, instead of a general "update status" endpoint. This makes the rules easy to see and to check. |
| **Versioning** | Not needed yet. If the API ever changes in a breaking way, a `/api/v2` prefix will be added. |

---

## 2. Response format

Every response follows one of three shapes, so the frontend can handle them all the same way.

**One item:**

```json
{
  "data": { "id": "c1d2...", "status": "confirmed" }
}
```

**A list (with pagination):**

```json
{
  "data": [ { "...": "..." }, { "...": "..." } ],
  "meta": { "page": 1, "pageSize": 20, "total": 134 }
}
```

**An error:**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Some fields are not valid.",
    "details": [
      { "field": "email", "message": "Please enter a valid email address." }
    ]
  }
}
```

The frontend uses `code` to decide what to do, and shows `message` to the user. `details` is only present for validation errors.

---

## 3. Status codes and error codes

| HTTP status | When it is used | Example error codes |
|---|---|---|
| `200 OK` | Read or update succeeded | — |
| `201 Created` | Something new was created | — |
| `204 No Content` | Success with nothing to return (for example logout, delete) | — |
| `202 Accepted` | Accepted for background processing (for example the contact form: the email is queued, not sent yet) | — |
| `400 Bad Request` | Input is invalid, or a one-time link is invalid or expired | `VALIDATION_ERROR`, `INVALID_TOKEN` |
| `401 Unauthorized` | Not logged in, or the session expired | `UNAUTHENTICATED`, `INVALID_CREDENTIALS` |
| `403 Forbidden` | Logged in, but not allowed | `FORBIDDEN`, `ACCOUNT_SUSPENDED`, `EMAIL_NOT_VERIFIED`, `SUBSCRIPTION_REQUIRED`, `PLAN_LIMIT_REACHED` |
| `404 Not Found` | The item does not exist, or belongs to someone else | `NOT_FOUND` |
| `409 Conflict` | The request clashes with the current state | `EMAIL_TAKEN`, `EMAIL_ALREADY_VERIFIED`, `SLOT_UNAVAILABLE`, `INVALID_STATUS_TRANSITION`, `CANCELLATION_WINDOW_PASSED`, `GO_LIVE_REQUIREMENTS_NOT_MET`, `CATEGORY_IN_USE`, `SUBSCRIPTION_ALREADY_EXISTS` |
| `429 Too Many Requests` | A rate limit was hit | `RATE_LIMITED` |
| `500 Internal Server Error` | An unexpected error happened | `INTERNAL_ERROR` |
| `503 Service Unavailable` | The health check found the database unreachable | — |

> **Security note:** If a business asks for a reservation that belongs to another business, the answer is `404 NOT_FOUND`, not `403`. That way nobody can find out whether an ID exists.

**Where codes come from:** Services throw domain errors with a code (for example `SLOT_UNAVAILABLE`). The API's error handler looks the code up in this table to pick the HTTP status. Services never choose HTTP statuses themselves.

---

## 4. Who can call what

| Label used below | Meaning |
|---|---|
| **Public** | Anyone, logged in or not |
| **Logged in** | Any logged-in user |
| **Customer** | Logged in with role `customer` |
| **Customer (verified)** | Customer whose email is confirmed |
| **Business** | Logged in with role `business_owner`. The API automatically finds *their* business. |
| **Admin** | Logged in with role `admin` |

Business endpoints never take a `businessId` in the URL. The business always comes from the logged-in owner, so it is impossible to act on someone else's business.

---

## 5. Pagination, filtering and sorting

| Query parameter | Default | Meaning |
|---|---|---|
| `page` | `1` | Page number |
| `pageSize` | `20` | Items per page (maximum `50`) |
| `status` | — | Filter by status, for example `?status=pending` |
| `search` | — | Text search, where supported |
| `from`, `to` | — | Date range (`YYYY-MM-DD`), where supported |

Each list has a sensible fixed sort order (for example: newest first, or soonest appointment first), so the frontend does not need sorting options in version 1.

---

## 6. Endpoints

### 6.1 System

| Method | Path | Who | Purpose |
|---|---|---|---|
| `GET` | `/health` | Public | Checks the app and the database. Returns `200` when healthy, `503` when the database is unreachable. See [section 7.13](#713-health-check). |

### 6.2 Authentication — `/api/auth`

| Method | Path | Who | Purpose |
|---|---|---|---|
| `POST` | `/api/auth/register/customer` | Public | Create a customer account, log in, queue the welcome email |
| `POST` | `/api/auth/register/business` | Public | Create a business-owner account with its business (status `pending_review`) and an unpublished profile. Log in, queue the welcome email, notify the admin. |
| `POST` | `/api/auth/login` | Public | Log in with email and password. Sets the session cookie. |
| `POST` | `/api/auth/logout` | Logged in | Clear the session cookie |
| `GET` | `/api/auth/me` | Logged in | Return the current user (and a business summary for owners) |
| `POST` | `/api/auth/verify-email` | Public | Confirm an email with the token from the email link |
| `POST` | `/api/auth/resend-verification` | Logged in | Send a new confirmation email |
| `POST` | `/api/auth/forgot-password` | Public | Queue a reset email. Always returns `200`. |
| `POST` | `/api/auth/reset-password` | Public | Set a new password with the token from the email link |

### 6.3 Account (all roles) — `/api/account`

| Method | Path | Who | Purpose |
|---|---|---|---|
| `PUT` | `/api/account/profile` | Logged in | Update name and phone |
| `POST` | `/api/account/change-password` | Logged in | Change password (current password required) |

### 6.4 Public — `/api`

| Method | Path | Who | Purpose |
|---|---|---|---|
| `GET` | `/api/categories` | Public | Active categories, for filters and homepage tiles |
| `GET` | `/api/cities` | Public | Cities that have visible businesses, for the location filter |
| `GET` | `/api/plans` | Public | Active subscription plans, for the pricing page |
| `GET` | `/api/businesses` | Public | Search visible businesses. Query: `search`, `category` (slug), `city`, `featured=true`, `page`, `pageSize`. |
| `GET` | `/api/businesses/:slug` | Public | Full public profile: details, photos, categories, active services, working hours |
| `GET` | `/api/businesses/:slug/availability` | Public | Free time slots. Query: `serviceId`, `date` (`YYYY-MM-DD`). |
| `POST` | `/api/contact` | Public | Send a contact form message to the platform admin. Answers `202`: the email is queued, the worker sends it. |

### 6.5 Customer — `/api/customer`

| Method | Path | Who | Purpose |
|---|---|---|---|
| `GET` | `/api/customer/overview` | Customer | Upcoming reservations, recent quote requests, counts |
| `GET` | `/api/customer/reservations` | Customer | My reservations. Query: `status`, `page`. |
| `POST` | `/api/customer/reservations` | Customer (verified) | Book an appointment |
| `GET` | `/api/customer/reservations/:id` | Customer | One of my reservations |
| `POST` | `/api/customer/reservations/:id/cancel` | Customer | Cancel (only if `pending` or `confirmed`, and before the cancellation deadline) |
| `GET` | `/api/customer/quote-requests` | Customer | My quote requests. Query: `status`, `page`. |
| `POST` | `/api/customer/quote-requests` | Customer (verified) | Send a quote request |
| `GET` | `/api/customer/quote-requests/:id` | Customer | One of my quote requests, including the business's answer |

### 6.6 Business — `/api/business`

**Overview and profile**

| Method | Path | Who | Purpose |
|---|---|---|---|
| `GET` | `/api/business/overview` | Business | **Go-live checklist** (each item: `key`, `label`, `done`, `requiredToPublish`), `canPublish`, `isVisible`, plan usage (services and photos used / limit), subscription summary. Today's appointments and pending items are added in phases 8 and 9. |
| `GET` | `/api/business/profile` | Business | My profile (including unpublished data), categories and photos |
| `PUT` | `/api/business/profile` | Business | Update name, description, contact details and address |
| `POST` | `/api/business/profile/logo` | Business | Upload or replace the logo (`multipart/form-data`, field `file`). The old file is deleted. |
| `DELETE` | `/api/business/profile/logo` | Business | Remove the logo |
| `PUT` | `/api/business/categories` | Business | Set my categories: `{ "categoryIds": [...] }` (1 to 3) |
| `POST` | `/api/business/photos` | Business | Upload a photo (`multipart/form-data`, fields `file`, `caption`). Checks the plan limit. |
| `PUT` | `/api/business/photos/order` | Business | Reorder photos: `{ "photoIds": [...] }` |
| `DELETE` | `/api/business/photos/:id` | Business | Delete a photo |
| `POST` | `/api/business/profile/publish` | Business | Make the profile public (checks the go-live requirements) |
| `POST` | `/api/business/profile/unpublish` | Business | Hide the profile |

**Services (offerings)**

| Method | Path | Who | Purpose |
|---|---|---|---|
| `GET` | `/api/business/services` | Business | All my services, including archived ones |
| `POST` | `/api/business/services` | Business | Add a service (checks the plan limit) |
| `PUT` | `/api/business/services/:id` | Business | Edit a service, or set `isActive` |
| `DELETE` | `/api/business/services/:id` | Business | Archive a service (it is hidden, but old reservations keep it) |

**Schedule and settings**

| Method | Path | Who | Purpose |
|---|---|---|---|
| `GET` | `/api/business/working-hours` | Business | My weekly working hours |
| `PUT` | `/api/business/working-hours` | Business | Replace the whole week in one request |
| `GET` | `/api/business/blocked-times` | Business | Upcoming blocked periods |
| `POST` | `/api/business/blocked-times` | Business | Block a period (holiday, break) |
| `DELETE` | `/api/business/blocked-times/:id` | Business | Remove a blocked period |
| `GET` | `/api/business/settings` | Business | Booking settings: time zone, slot interval, notice and cancellation rules |
| `PUT` | `/api/business/settings` | Business | Update booking settings |

**Reservations**

| Method | Path | Who | Purpose |
|---|---|---|---|
| `GET` | `/api/business/reservations` | Business | My reservations. Query: `status`, `from`, `to`, `page`. |
| `GET` | `/api/business/reservations/:id` | Business | One reservation, with customer information |
| `POST` | `/api/business/reservations/:id/confirm` | Business | `pending` → `confirmed` |
| `POST` | `/api/business/reservations/:id/reject` | Business | `pending` → `rejected`. Body: `{ "message"?: string }` |
| `POST` | `/api/business/reservations/:id/cancel` | Business | `pending` or `confirmed` → `cancelled`. Body: `{ "message"?: string }` |
| `POST` | `/api/business/reservations/:id/complete` | Business | `confirmed` → `completed` (only after the start time) |

**Quote requests**

| Method | Path | Who | Purpose |
|---|---|---|---|
| `GET` | `/api/business/quote-requests` | Business | My quote requests. Query: `status`, `page`. |
| `GET` | `/api/business/quote-requests/:id` | Business | One request, with customer information |
| `POST` | `/api/business/quote-requests/:id/start` | Business | `pending` → `processing` ("we're working on it") |
| `POST` | `/api/business/quote-requests/:id/respond` | Business | `pending` or `processing` → `completed`. Body: `{ "message": string, "quotedPriceCents"?: number }` |
| `POST` | `/api/business/quote-requests/:id/reject` | Business | `pending` or `processing` → `rejected`. Body: `{ "message"?: string }` |

**Subscription and payments**

| Method | Path | Who | Purpose |
|---|---|---|---|
| `GET` | `/api/business/subscription` | Business | Current subscription, plan, period dates, usage against limits, scheduled plan change |
| `POST` | `/api/business/subscription/checkout` | Business | Start a subscription: `{ "planId": "..." }`. Creates the subscription (`pending_payment`) and a payment (`pending`), and returns the next step. |
| `POST` | `/api/business/subscription/renew` | Business | Create a renewal payment for the next period |
| `POST` | `/api/business/subscription/change-plan` | Business | Schedule a plan change at the next renewal: `{ "planId": "..." }` |
| `POST` | `/api/business/subscription/cancel` | Business | Stop at the end of the current period |
| `POST` | `/api/business/subscription/resume` | Business | Undo a cancellation before the period ends |
| `GET` | `/api/business/payments` | Business | Payment history |
| `POST` | `/api/business/payments/:id/mock-complete` | Business | **Development only** (`PAYMENT_PROVIDER=mock`): simulate a payment. Body: `{ "outcome": "success" \| "failure" }` |

### 6.7 Admin — `/api/admin`

**Overview and monitoring**

| Method | Path | Who | Purpose |
|---|---|---|---|
| `GET` | `/api/admin/overview` | Admin | Key numbers, recent activity, email queue status |
| `GET` | `/api/admin/activity` | Admin | Full activity log. Query: `page`. |
| `GET` | `/api/admin/email-jobs` | Admin | Email queue. Query: `status` (for example `failed`), `page`. The payload is never returned (it can contain private links). |
| `GET` | `/api/admin/email-jobs/stats` | Admin | Number of `pending`, `sent` and `failed` jobs |
| `POST` | `/api/admin/email-jobs/:id/retry` | Admin | Put a failed email back in the queue |

**Businesses and users**

| Method | Path | Who | Purpose |
|---|---|---|---|
| `GET` | `/api/admin/businesses` | Admin | All businesses. Query: `status`, `search`, `page`. |
| `GET` | `/api/admin/businesses/:id` | Admin | Business details: owner, profile, subscription, payments, counts |
| `POST` | `/api/admin/businesses/:id/approve` | Admin | `pending_review` or `suspended` → `approved` |
| `POST` | `/api/admin/businesses/:id/suspend` | Admin | → `suspended`. Body: `{ "reason": string }` |
| `POST` | `/api/admin/businesses/:id/deactivate` | Admin | → `deactivated`. Body: `{ "reason": string }` |
| `POST` | `/api/admin/businesses/:id/reactivate` | Admin | `deactivated` → `approved` |
| `GET` | `/api/admin/users` | Admin | All users. Query: `role` (for example `customer`), `status`, `search`, `page`. |
| `GET` | `/api/admin/users/:id` | Admin | User details with reservation and quote counts |
| `POST` | `/api/admin/users/:id/suspend` | Admin | Block login. Body: `{ "reason": string }` |
| `POST` | `/api/admin/users/:id/reactivate` | Admin | Allow login again |

**Reservations and quotes (read-only)**

| Method | Path | Who | Purpose |
|---|---|---|---|
| `GET` | `/api/admin/reservations` | Admin | All reservations. Query: `status`, `businessId`, `from`, `to`, `page`. |
| `GET` | `/api/admin/quote-requests` | Admin | All quote requests. Query: `status`, `businessId`, `page`. |

**Subscriptions, payments and plans**

| Method | Path | Who | Purpose |
|---|---|---|---|
| `GET` | `/api/admin/subscriptions` | Admin | All subscriptions. Query: `status`, `page`. |
| `GET` | `/api/admin/subscriptions/:id` | Admin | One subscription with its payments |
| `GET` | `/api/admin/payments` | Admin | All payments. Query: `status`, `page`. |
| `POST` | `/api/admin/payments/:id/mark-paid` | Admin | Confirm a manual bank transfer. Body: `{ "reference": string }` |
| `POST` | `/api/admin/payments/:id/mark-failed` | Admin | Mark a payment as failed |
| `GET` | `/api/admin/plans` | Admin | All plans, including inactive ones |
| `POST` | `/api/admin/plans` | Admin | Create a plan |
| `PUT` | `/api/admin/plans/:id` | Admin | Edit a plan or set `isActive` (plans are never deleted) |

**Categories**

| Method | Path | Who | Purpose |
|---|---|---|---|
| `GET` | `/api/admin/categories` | Admin | All categories, with business counts |
| `POST` | `/api/admin/categories` | Admin | Create a category |
| `PUT` | `/api/admin/categories/:id` | Admin | Edit, reorder or set `isActive` |
| `DELETE` | `/api/admin/categories/:id` | Admin | Delete (only if no business uses it, otherwise `409 CATEGORY_IN_USE`) |

---

## 7. Detailed examples

### 7.1 Register a customer

```http
POST /api/auth/register/customer
Content-Type: application/json

{
  "fullName": "Sara Miller",
  "email": "sara@example.com",
  "password": "MySecret123",
  "phone": "+49 151 2345678"
}
```

**`201 Created`.** The session cookie is set, so the user is logged in right away.

```json
{
  "data": {
    "user": {
      "id": "4f1c2a9e-...",
      "fullName": "Sara Miller",
      "email": "sara@example.com",
      "role": "customer",
      "emailVerified": false
    }
  }
}
```

**Possible errors:** `400 VALIDATION_ERROR`, `409 EMAIL_TAKEN`, `429 RATE_LIMITED`.

### 7.2 Register a business

```http
POST /api/auth/register/business
Content-Type: application/json

{
  "fullName": "Lena Novak",
  "email": "lena@bellahair.example",
  "password": "SalonPass2026",
  "businessName": "Bella Hair Studio",
  "city": "Berlin",
  "timezone": "Europe/Berlin",
  "categoryIds": ["b1c0...-beauty"]
}
```

**`201 Created`:**

```json
{
  "data": {
    "user": { "id": "9a7e...", "fullName": "Lena Novak", "role": "business_owner", "emailVerified": false },
    "business": { "id": "b7e2...", "status": "pending_review", "slug": "bella-hair-studio", "isPublished": false }
  }
}
```

The slug is made from the business name. If it is already taken, a number is added (`bella-hair-studio-2`).

### 7.3 Log in

```http
POST /api/auth/login
Content-Type: application/json

{ "email": "sara@example.com", "password": "MySecret123" }
```

**`200 OK`** (cookie set) returns the same `user` object as registration. The frontend sends the user to the right place based on `role`: customers to `/account`, business owners to `/dashboard`, admins to `/admin`.

**Errors:** `401 INVALID_CREDENTIALS` (the same message whether the email or the password is wrong), `403 ACCOUNT_SUSPENDED`, `429 RATE_LIMITED`.

### 7.4 Search businesses

```http
GET /api/businesses?search=hair&category=beauty-wellness&city=Berlin&page=1&pageSize=12
```

**`200 OK`:**

```json
{
  "data": [
    {
      "slug": "bella-hair-studio",
      "displayName": "Bella Hair Studio",
      "shortDescription": "Modern cuts and coloring in the city center.",
      "logoUrl": "https://files.quickquote.example/businesses/b7e2/logo.webp",
      "city": "Berlin",
      "categories": [{ "slug": "beauty-wellness", "name": "Beauty & Wellness" }],
      "startingPriceCents": 2500,
      "isFeatured": true
    }
  ],
  "meta": { "page": 1, "pageSize": 12, "total": 1 }
}
```

- `shortDescription` is the first 160 characters of the description.
- `startingPriceCents` is the lowest price among the business's active services.
- Only publicly visible businesses are returned (see [DATABASE_DESIGN.md → 8.1](DATABASE_DESIGN.md#81-which-businesses-are-publicly-visible)).

### 7.5 Business profile

```http
GET /api/businesses/bella-hair-studio
```

**`200 OK`:**

```json
{
  "data": {
    "id": "b7e2...",
    "slug": "bella-hair-studio",
    "displayName": "Bella Hair Studio",
    "description": "Modern cuts and coloring in the city center...",
    "logoUrl": "https://files.quickquote.example/businesses/b7e2/logo.webp",
    "photos": [{ "id": "p1...", "imageUrl": "https://...", "caption": "Our salon" }],
    "contact": { "email": "hello@bellahair.example", "phone": "+49 30 1234567", "websiteUrl": "https://bellahair.example" },
    "address": { "line": "Hauptstrasse 1", "city": "Berlin", "postalCode": "10115", "country": "DE" },
    "categories": [{ "slug": "beauty-wellness", "name": "Beauty & Wellness" }],
    "timezone": "Europe/Berlin",
    "isFeatured": true,
    "services": [
      {
        "id": "s91a...",
        "name": "Women's haircut",
        "description": "Wash, cut and styling",
        "priceType": "fixed",
        "priceCents": 4500,
        "durationMinutes": 60,
        "isBookable": true
      },
      {
        "id": "s22b...",
        "name": "Bridal hair",
        "priceType": "on_request",
        "priceCents": null,
        "durationMinutes": null,
        "isBookable": false
      }
    ],
    "workingHours": [
      { "dayOfWeek": 1, "startTime": "09:00", "endTime": "18:00" },
      { "dayOfWeek": 2, "startTime": "09:00", "endTime": "18:00" }
    ]
  }
}
```

If the business is not publicly visible, the answer is `404 NOT_FOUND`.

### 7.6 Available time slots

```http
GET /api/businesses/bella-hair-studio/availability?serviceId=s91a...&date=2026-11-10
```

**`200 OK`:**

```json
{
  "data": {
    "date": "2026-11-10",
    "timezone": "Europe/Berlin",
    "service": { "id": "s91a...", "name": "Women's haircut", "durationMinutes": 60 },
    "slots": [
      { "startsAt": "2026-11-10T08:00:00.000Z", "localTime": "09:00" },
      { "startsAt": "2026-11-10T08:30:00.000Z", "localTime": "09:30" },
      { "startsAt": "2026-11-10T11:00:00.000Z", "localTime": "12:00" }
    ]
  }
}
```

Berlin is UTC+1 in November, so 09:00 local time is `08:00Z`. An empty `slots` list means the business is fully booked or closed that day.

**Errors:** `400 VALIDATION_ERROR` (date in the past, or too far ahead), `404 NOT_FOUND` (business not visible, or service not bookable).

### 7.7 Create a reservation

```http
POST /api/customer/reservations
Content-Type: application/json

{
  "businessId": "b7e2...",
  "serviceId": "s91a...",
  "startsAt": "2026-11-10T08:30:00.000Z",
  "notes": "First visit. I would like a short bob.",
  "phone": "+49 151 2345678"
}
```

**`201 Created`:**

```json
{
  "data": {
    "id": "r55c...",
    "status": "pending",
    "business": { "slug": "bella-hair-studio", "displayName": "Bella Hair Studio", "timezone": "Europe/Berlin" },
    "service": { "name": "Women's haircut", "priceType": "fixed", "priceCents": 4500 },
    "startsAt": "2026-11-10T08:30:00.000Z",
    "endsAt": "2026-11-10T09:30:00.000Z",
    "customerNotes": "First visit. I would like a short bob.",
    "canCancel": true,
    "createdAt": "2026-11-01T12:00:00.000Z"
  }
}
```

**Errors:**

| Status | Code | When |
|---|---|---|
| `400` | `VALIDATION_ERROR` | Missing fields, or a time in the past |
| `403` | `EMAIL_NOT_VERIFIED` | The customer has not confirmed their email |
| `404` | `NOT_FOUND` | The business is not visible, or the service is not bookable |
| `409` | `SLOT_UNAVAILABLE` | Someone else just booked this time, or it is outside working hours |

```json
{
  "error": {
    "code": "SLOT_UNAVAILABLE",
    "message": "Sorry, this time was just booked by someone else. Please choose another time."
  }
}
```

### 7.8 Business confirms or rejects a reservation

```http
POST /api/business/reservations/r55c.../confirm
```

**`200 OK`** returns the reservation with `"status": "confirmed"` and `confirmedAt`. A confirmation email to the customer is queued.

```http
POST /api/business/reservations/r55c.../reject
Content-Type: application/json

{ "message": "Sorry, I am fully booked that morning. Could you try Wednesday?" }
```

**`200 OK`** returns the reservation with `"status": "rejected"`. A rejection email with the message is queued.

**Error:** `409 INVALID_STATUS_TRANSITION`, for example when confirming a reservation that was already cancelled.

### 7.9 Customer cancels a reservation

```http
POST /api/customer/reservations/r55c.../cancel
Content-Type: application/json

{ "reason": "I am sick, sorry!" }
```

**`200 OK`** returns the reservation with `"status": "cancelled"` and `"cancelledBy": "customer"`. The business is emailed.

**Error:** `409 CANCELLATION_WINDOW_PASSED`, when the appointment starts in less than the business's `cancellationNoticeHours`.

### 7.10 Send and answer a quote request

**The customer sends a request:**

```http
POST /api/customer/quote-requests
Content-Type: application/json

{
  "businessId": "b9f1...",
  "serviceId": null,
  "subject": "Renovate small bathroom",
  "description": "About 5 m². New tiles, shower instead of bathtub, new toilet.",
  "preferredDate": "2027-01-15",
  "budgetCents": 500000,
  "phone": "+49 151 2345678"
}
```

The answer is **`201 Created`** with `"status": "pending"`. Two emails are queued: one to the business and one confirmation to the customer.

**The business answers:**

```http
POST /api/business/quote-requests/q77d.../respond
Content-Type: application/json

{
  "quotedPriceCents": 460000,
  "message": "Price includes materials and labour. Work takes about 6 days. We can start on 18 January."
}
```

The answer is **`200 OK`** with `"status": "completed"`. The customer is emailed with the price and message.

### 7.11 Start a subscription (mock payment)

```http
POST /api/business/subscription/checkout
Content-Type: application/json

{ "planId": "plan-professional-id" }
```

**`201 Created`:**

```json
{
  "data": {
    "subscription": {
      "id": "sub1...",
      "status": "pending_payment",
      "plan": { "code": "professional", "name": "Professional", "priceCents": 3900, "currency": "EUR" }
    },
    "payment": { "id": "pay1...", "amountCents": 3900, "currency": "EUR", "status": "pending", "provider": "mock" },
    "nextStep": { "type": "mock_checkout", "url": "/dashboard/subscription/checkout/pay1..." }
  }
}
```

With `PAYMENT_PROVIDER=manual`, `nextStep` contains bank transfer instructions instead:

```json
{ "type": "bank_transfer", "instructions": "Bank: ... IBAN: ...", "reference": "QQ-PAY1-7F3A" }
```

**Simulate the payment (development only):**

```http
POST /api/business/payments/pay1.../mock-complete
Content-Type: application/json

{ "outcome": "success" }
```

**`200 OK`.** The payment becomes `paid` and the subscription becomes `active`, with `currentPeriodStart` = now and `currentPeriodEnd` = now + 1 month. An "activated" email is queued.

### 7.12 Publish a profile when requirements are missing

```http
POST /api/business/profile/publish
```

**`409 Conflict`:**

```json
{
  "error": {
    "code": "GO_LIVE_REQUIREMENTS_NOT_MET",
    "message": "Your profile is not ready to be published yet.",
    "details": [
      { "field": "description", "message": "Add a description." },
      { "field": "services", "message": "Add at least one active service." }
    ]
  }
}
```

### 7.13 Health check

```http
GET /health
```

| Situation | Status | Body |
|---|---|---|
| Everything works | `200` | `{ "status": "ok", "checks": { "app": "ok", "database": "ok" }, "uptimeSeconds": 86400, "timestamp": "..." }` |
| Database unreachable or too slow (more than 2 s) | `503` | `{ "status": "error", "checks": { "app": "ok", "database": "unreachable" }, "uptimeSeconds": 86400, "timestamp": "..." }` |

No login is needed, the response is never cached and the endpoint is not rate-limited.

---

### 7.14 Uploaded images

- Logos and photos are sent as `multipart/form-data` with the image in the field `file` (photos may also send `caption`).
- The backend checks the size (at most 5 MB) and the **real** file type from the file's first bytes (JPEG, PNG or WebP), never just the file name. Files get random names.
- The response contains the image address, for example `"logoUrl": "/uploads/businesses/<business id>/<random>.png"`. The API serves these files at `/uploads/...`; the frontend puts its API base address in front.

## 8. Validation rules

The **request models** in `src/models/requests/` define these rules as Zod schemas. Each controller checks the request against its schema with the `parseRequest()` helper (`src/api/validation.ts`) before calling a service, and gets back clean, typed data.

| Field | Rule |
|---|---|
| `email` | Valid email format, at most 254 characters, converted to lowercase |
| `password` | 8 to 72 characters, at least one letter and one number |
| `fullName`, `displayName` | 2 to 100 characters, trimmed |
| `phone` | Optional, 6 to 20 characters: digits, spaces, `+`, `-`, `(`, `)` |
| `description` (profile) | Up to 2000 characters |
| `notes` (reservation) | Up to 1000 characters |
| `subject` (quote) | 3 to 150 characters |
| `description` (quote) | 10 to 3000 characters |
| `priceCents`, `budgetCents`, `quotedPriceCents` | Whole number, 0 to 100,000,000 |
| `durationMinutes` | Whole number, 5 to 480 |
| `startsAt` | Valid ISO 8601 date-time, in the future |
| `date` (availability) | `YYYY-MM-DD`, not in the past |
| `timezone` | A valid IANA time zone name (checked with Luxon) |
| `categoryIds` | 1 to 3 valid category IDs |
| Working hours | `startTime` and `endTime` in `HH:MM` format, `endTime` after `startTime`, no overlapping ranges on the same day |
| Uploaded images | JPEG, PNG or WebP, at most 5 MB |
| `page` | Whole number ≥ 1 |
| `pageSize` | Whole number, 1 to 50 |

---

## 9. Rate limits

These limits protect against spam and password guessing. They use `express-rate-limit`. When a limit is hit, the API answers `429 RATE_LIMITED`.

| Endpoint | Limit |
|---|---|
| `POST /api/auth/login` | 10 attempts per 15 minutes per IP address |
| `POST /api/auth/register/*` | 5 per hour per IP address |
| `POST /api/auth/forgot-password`, `/resend-verification` | 5 per hour per IP address |
| `POST /api/contact` | 5 per hour per IP address |
| `POST /api/customer/reservations` | 20 per hour per user |
| `POST /api/customer/quote-requests` | 20 per hour per user |
| Everything else under `/api` | 300 per 15 minutes per IP address |
| `GET /health` | No limit |

In version 1, the counters are kept in the server's memory, which is fine for one API server. If we ever run several API servers, the counters can be moved to the database or Redis.
