# Quick Quote

Quick Quote is a platform for finding businesses, requesting quotes and booking appointments.

- **Businesses** pay a monthly subscription. For that they get a public profile, a list of their services and prices, and they can receive quotation requests and reservations.
- **Customers** use the platform for free. They can find businesses, compare services, request quotes and book appointments.
- **Administrators** run the platform. They approve businesses, manage categories and plans, and keep an eye on activity.

> **Status: planning phase.** The architecture and planning documents are ready for review.
> No application code has been written yet. Implementation starts after the plan is approved.

## Backend requirements

The plan is designed to meet every backend requirement: four layers, PostgreSQL with migrations and seeds, a Resend email queue with retries, `GET /health` monitored on Asniher, and a clean delivery. The backend core is built and deployed first (phases 1–3).
See the [requirements checklist](docs/PROJECT_OVERVIEW.md#10-backend-requirements-checklist).

## Planning documents

Read them in this order:

| # | Document | What it answers |
|---|---|---|
| 1 | [Project Overview](docs/PROJECT_OVERVIEW.md) | What are we building, for whom, with which tools, and in which order? |
| 2 | [Features](docs/FEATURES.md) | What can each type of user do? What is on each of the 29 pages? |
| 3 | [User Flows](docs/USER_FLOWS.md) | Step by step, how does each user get things done? |
| 4 | [Architecture](docs/ARCHITECTURE.md) | How do the frontend, backend, database and email worker work together? |
| 5 | [Database Design](docs/DATABASE_DESIGN.md) | Which tables exist, how are they connected, and which rules protect the data? |
| 6 | [API Design](docs/API_DESIGN.md) | Which endpoints does the backend offer, and what do they accept and return? |
| 7 | [Subscription Model](docs/SUBSCRIPTION_MODEL.md) | How do plans, payments, renewals and expirations work? |
| 8 | [Email Workflow](docs/EMAIL_WORKFLOW.md) | How are emails queued and sent in the background? |
| 9 | [Project Structure](docs/PROJECT_STRUCTURE.md) | Where does each piece of code go? |

## Diagrams

| Diagram | Where |
|---|---|
| System architecture | [ARCHITECTURE.md → System architecture diagram](docs/ARCHITECTURE.md#2-system-architecture-diagram) |
| Backend layers | [ARCHITECTURE.md → The four backend layers](docs/ARCHITECTURE.md#5-the-four-backend-layers) |
| Database relationships | [DATABASE_DESIGN.md → Relationship diagram](docs/DATABASE_DESIGN.md#3-relationship-diagram) |
| Reservation workflow | [USER_FLOWS.md → Make a reservation](docs/USER_FLOWS.md#4-make-a-reservation) |
| Email queue workflow | [EMAIL_WORKFLOW.md → Email queue workflow diagram](docs/EMAIL_WORKFLOW.md#4-email-queue-workflow-diagram) |
| Subscription lifecycle | [SUBSCRIPTION_MODEL.md → Subscription statuses](docs/SUBSCRIPTION_MODEL.md#5-subscription-statuses) |

The diagrams are written in [Mermaid](https://mermaid.js.org/). GitHub draws them automatically when you open the files.

## Tech stack at a glance

| Part | Choice |
|---|---|
| Frontend | React + Vite + TypeScript + React Router + Tailwind CSS |
| Backend | Node.js + Express + TypeScript (one small monolith, four layers) |
| Database | PostgreSQL, with plain SQL, migrations and seed scripts |
| Emails | Resend, sent by a background worker through a PostgreSQL-based queue |
| Monitoring | `GET /health` endpoint, watched by Asniher |

Read [PROJECT_OVERVIEW.md](docs/PROJECT_OVERVIEW.md#6-technology-choices) for the reasons behind each choice.
