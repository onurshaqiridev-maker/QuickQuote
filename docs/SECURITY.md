# Quotiva — Security

This page explains how Quotiva protects its users, what the phase 11 security review found and fixed, which small risks were accepted on purpose, and what to check before going live.

## 1. How the app is protected

| Area | Protection | Where |
|---|---|---|
| **Passwords** | Stored only as bcrypt hashes (cost 12). 8 to 72 characters, at least one letter and one number. | `services/password.service.ts`, `models/requests/common.requests.ts` |
| **Login** | Same answer for "unknown email" and "wrong password", and a dummy hash check for unknown emails, so timing does not reveal which emails exist. 10 tries per 15 minutes per IP address. | `services/auth.service.ts`, `api/middleware/rate-limit.ts` |
| **Sessions** | A signed token (JWT, HS256 only) in an `httpOnly`, `SameSite=Lax` cookie, `Secure` in production. The user is loaded from the database on every request, so a suspended account is blocked at once. Sessions that started **before the last password change are refused**. | `services/session.service.ts`, `api/session-cookie.ts` |
| **Email links** | Confirmation and reset tokens are random (32 bytes), stored only as a SHA-256 hash, single-use and short-lived (48 hours / 1 hour). | `services/auth.service.ts` |
| **Who may do what** | Every route group checks the role (`customer`, `business_owner`, `admin`). Businesses only ever act on their own business; a reservation or quote of someone else looks like "not found" (404), so nobody can probe ids. | `api/routes/*.ts`, services |
| **Cross-site requests (CSRF)** | `SameSite=Lax` cookies are not sent with forms posted from other websites, and the API only reads JSON bodies. | `api/session-cookie.ts`, `api/app.ts` |
| **Input** | Every request body, query and URL parameter is checked with Zod; unknown fields are dropped. Text fields have length limits; web addresses must start with `http(s)://`. | `models/requests/*.ts` |
| **Database** | Only parameterized SQL (`$1, $2 ...`), never user text inside SQL. Search text is escaped for `LIKE`. Status changes check the current status inside the `UPDATE`, so two clicks at once cannot both succeed. | `data/repositories/*.ts`, `data/search-pattern.ts` |
| **Uploads** | 5 MB limit, the real file type is read from the file's first bytes (JPEG, PNG, WebP only), random file names, deletes can never leave the upload folder. | `services/storage.service.ts` |
| **Emails** | Everything users write is HTML-escaped in emails. Emails are sent by the background worker only. | `services/email/templates/layout.ts` |
| **Browser** | Helmet security headers: Content Security Policy (only our own scripts), HSTS, `nosniff`, no framing by other sites. React escapes all text. | `api/app.ts` |
| **Abuse** | Rate limits on registration, login, email links, the contact form, bookings and quote requests (per user), password changes (per user) and the whole API. Request bodies are limited to 100 KB. | `api/middleware/rate-limit.ts` |
| **Errors and logs** | Unknown errors return a plain "Something went wrong" without details. Logs contain method, path, status and duration, never bodies, cookies or passwords. | `api/middleware/error-handler.ts`, `api/middleware/request-logger.ts` |
| **Settings** | All settings are checked at start-up. In production the app refuses to start when email links would point to `localhost`. | `config/env.ts` |

## 2. Phase 11 review: findings and fixes

| # | Finding | Risk | Fix | Test |
|---|---|---|---|---|
| 1 | A password reset or change did not end existing login sessions. Someone who had stolen a session stayed logged in for up to 7 days. | High | `users.password_changed_at` (migration 13). Sessions that started before it are refused. Changing the password gives the current device a fresh session; other devices are logged out. | `tests/integration/sessions.test.ts`, `tests/unit/session.test.ts` |
| 2 | "Change password" had no limit of its own, so a stolen session could be used to guess the current password. | Medium | At most 10 attempts per 15 minutes per user. | Configuration in `api/routes/account.routes.ts` (rate limits are switched off in automated tests) |
| 3 | In production, email links (confirm email, reset password, dashboards) would have pointed to `http://localhost:5173`, because `render.yaml` did not set `FRONTEND_URL`. | Medium | `FRONTEND_URL` defaults to Render's public address; the app refuses to start in production with a `localhost` address. | `tests/unit/env.test.ts` |
| 4 | The website and the API on two different `onrender.com` addresses would count as different sites, so browsers would not send the login cookie. | Medium (broken logins) | The API server also serves the built website: one address, no CORS needed. | `tests/integration/website.test.ts` |

Checked and found fine: login timing and messages, token handling, role checks on every route group, ownership checks on reservations, quotes and business data, SQL parameters, file uploads, email escaping, web address validation (no `javascript:` links), open redirects after login, error messages and logs, security headers on the served website.

## 3. Risks accepted on purpose

| Risk | Why it is accepted (for now) |
|---|---|
| Logging out only removes the cookie; a copied session token keeps working until it expires (7 days) or the password changes. | The cookie is `httpOnly`, so page scripts cannot copy it. Changing the password ends all sessions. A server-side session list can come later. |
| Registration says when an email is already taken. | Usual for sign-up forms and much friendlier. Registration is limited to 5 per hour per IP address. |
| `npm audit` reports 3 moderate issues in `glob` / `minimatch` (backend, used by `node-pg-migrate`) and in the frontend's lint tools. | `node-pg-migrate` only searches our own `migrations` folder, never user input, and the lint tools never run on the live site. npm's only offered fix is a breaking downgrade. Check again when updating packages. |
| Rate limits are counted in the server's memory. | Fine for one server. With several servers they would need a shared store (for example Redis). |
| On Render's free plan, uploaded logos and photos are lost when the service restarts or redeploys. | Not a security issue, but important: see [DEPLOYMENT.md](DEPLOYMENT.md#free-plan-good-to-know). A paid disk or cloud storage fixes it; only `storage.service.ts` would change. |

## 4. Checklist before going live

- [ ] `SEED_ADMIN_PASSWORD` is long and unique (at least 16 characters), and you changed it after the first login.
- [ ] `JWT_SECRET` is generated by Render (`generateValue: true`), never copied into the code or a chat.
- [ ] `RESEND_API_KEY` is only in Render's environment settings. `.env` files are never committed (`.gitignore` covers them).
- [ ] `NODE_ENV=production` (secure cookies, no demo seed).
- [ ] Never run `npm run seed:demo` against the live database (it refuses in production anyway).
- [ ] The Asniher monitor checks `/health` and alerts you.
- [ ] Before real customers: a verified sending domain in Resend, and a backup plan for the database (Render's free database expires after 30 days).
