# Parking Lot System


**Stack:** React · Node.js / Express · PostgreSQL · w3id (OIDC) · GPS Confirmation

---

## Table of Contents

1. [System Rules](#system-rules)
2. [Booking State Machine](#booking-state-machine)
3. [Data Models](#data-models)
4. [API Endpoints](#api-endpoints)
5. [Sub-Tasks](#sub-tasks)
6. [Security Checklist](#security-checklist)
7. [Future Enhancements](#future-enhancements)

---

## System Rules

| Rule | Detail |
|---|---|
| **Booking Window** | Only within 15 min of arrival |
| **Arrival Confirmation** | GPS must place you inside the lot boundary |
| **Auto-Release — No-show** | Slot freed if not GPS-confirmed within 15 min |
| **Auto-Release — Overstay** | Slot freed after 12 hours regardless |
| **Manual Release** | User frees slot from the app when leaving |
| **Multi-Booking** | Allowed — book on behalf of a colleague |
| **Payment** | None |
| **Authentication** | w3id SSO only (OIDC) |

---

## Booking State Machine

```
        AVAILABLE SLOT
              │
       user books slot
              │
           PENDING
              │
    ┌─────── 15-minute GPS confirmation window ────────┐
    │                                                   │
No GPS confirm in 15 min                   GPS confirms within 15 min
    │                                                   │
 EXPIRED                                           CONFIRMED
    │                                        (Slot is yours — no time limit)
slot = available                    ┌──────────────────┴──────────────────┐
                               User releases manually            12 hours pass
                                       │                                   │
                                   RELEASED                         AUTO-RELEASED
                                       │                                   │
                               slot = available                    slot = available
```

---

## Data Models

### `users`

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `w3id` | VARCHAR | Unique w3id |
| `name` | VARCHAR | From OIDC token |
| `email` | VARCHAR | From OIDC token |
| `created_at` | TIMESTAMP | |

### `parking_slots`

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `slot_number` | VARCHAR | e.g. `"A-12"` |
| `status` | ENUM | `available` / `reserved` / `occupied` |
| `location_lat` | FLOAT | GPS latitude |
| `location_lng` | FLOAT | GPS longitude |

### `bookings`

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `user_id` | UUID | FK → users |
| `slot_id` | UUID | FK → parking_slots |
| `status` | ENUM | `pending` / `confirmed` / `released` / `expired` |
| `booked_at` | TIMESTAMP | Creation time |
| `confirmed_at` | TIMESTAMP | GPS confirm time |
| `released_at` | TIMESTAMP | When freed |
| `expires_at` | TIMESTAMP | `booked_at + 15 min` |
| `auto_release_at` | TIMESTAMP | `confirmed_at + 12 hrs` |

---

## API Endpoints

| Method | Path | Description | Key Response |
|---|---|---|---|
| `GET` | `/api/slots` | List all slots with live status | 200 — array of slots |
| `POST` | `/api/bookings` | Reserve a slot — sets 15-min expiry | 201 created / 409 conflict |
| `POST` | `/api/bookings/:id/confirm` | GPS arrival confirm — activates slot | 200 / 403 not at lot / 410 expired |
| `POST` | `/api/bookings/:id/release` | Manually free your slot when leaving | 200 / 403 not owner |
| `GET` | `/auth/login` | Redirect to w3id OIDC login | 302 redirect |
| `GET` | `/auth/callback` | OIDC callback — sets session cookie | 302 redirect to app |
| `GET` | `/auth/logout` | Destroy session, redirect to login | 302 redirect |

---

## Sub-Tasks

### 1. Project Scaffolding and Repository Structure

Set up the monorepo layout, install dependencies, and establish base configuration for both frontend and backend.

- [ ] Create monorepo root with `package.json`
- [ ] Scaffold `/client` with Vite + React
- [ ] Scaffold `/server` with Express — `routes/`, `controllers/`, `services/`, `models/`, `middleware/`
- [ ] Add `.env.example` with all required keys (`DATABASE_URL`, `OIDC_*`, `SESSION_SECRET`, `PARKING_LOT_*`)
- [ ] Add `.gitignore` covering `node_modules`, `.env`, build artifacts
- [ ] Configure ESLint + Prettier

> **Tags:** React · Express · Never commit secrets

---

### 2. Database Setup and Migrations

Define and version-control the PostgreSQL schema. All table structures and constraints live here.

- [ ] Install a migration tool (`node-pg-migrate` or `db-migrate`)
- [ ] Migration: `users` table
- [ ] Migration: `parking_slots` table with ENUM status
- [ ] Migration: `bookings` table with FK constraints
- [ ] Indexes on `bookings(status, expires_at)` and `bookings(status, auto_release_at)`
- [ ] Dev seed script — 20 sample parking slots

> **Tags:** PostgreSQL · Parameterized queries only — no injection

---

### 3. w3id Authentication (OIDC)

Integrate w3id as the sole auth mechanism using OpenID Connect. No username/password, no custom registration.

- [ ] Install `passport` + `passport-openidconnect` (or `openid-client`)
- [ ] Configure OIDC strategy from environment variables
- [ ] Upsert user in DB on login using `w3id` as unique key
- [ ] Set session with `httpOnly`, `secure`, `sameSite` cookie flags
- [ ] Create `requireAuth` middleware — returns 401 if no session
- [ ] Implement `/auth/login`, `/auth/callback`, `/auth/logout` routes

> **Tags:** w3id · OIDC · Secure cookies · No tokens in logs

---

### 4. Parking Slot Listing API

Endpoint that returns real-time state of all slots so the frontend can render a live colour-coded grid.

- [ ] Create `GET /api/slots` (protected by `requireAuth`)
- [ ] Query `parking_slots` joined with active bookings for live status
- [ ] Return `id`, `slot_number`, `status`, `location_lat`, `location_lng` per slot
- [ ] Support optional `?status=` filter query param

> **Tags:** API · available / reserved / occupied

---

### 5. Booking Creation API

Reserve an available slot inside a DB transaction to prevent race conditions between simultaneous bookings.

- [ ] `POST /api/bookings` with body `{ slot_id }`
- [ ] DB transaction: check availability, insert booking, update slot to `reserved`
- [ ] Set `expires_at = NOW() + 15 minutes` (server-side only)
- [ ] Return 201 on success / 409 if slot is taken
- [ ] Validate `slot_id` is a valid UUID — reject malformed input

> **Tags:** API · DB transaction — no race conditions · Server-side timestamps

---

### 6. GPS Arrival Confirmation API

The anti-abuse gate. User submits GPS coords; backend uses Haversine formula to verify they are physically inside the parking lot before activating the slot.

- [ ] `POST /api/bookings/:id/confirm` with body `{ lat, lng }`
- [ ] Read `PARKING_LOT_LAT`, `PARKING_LOT_LNG`, `PARKING_LOT_RADIUS_METERS` from env
- [ ] Implement Haversine distance formula in `gpsService` utility
- [ ] Return 410 Gone if booking has already expired
- [ ] Return 403 if user is outside the lot radius
- [ ] On success: `confirmed_at = NOW()`, `auto_release_at = NOW() + 12 hrs`, slot = `occupied`

> **Tags:** GPS · Haversine · Configurable radius via env var

---

### 7. Slot Release API

Primary exit path — user manually frees their slot when they leave the parking lot.

- [ ] `POST /api/bookings/:id/release`
- [ ] Verify booking belongs to `req.user` — return 403 if not
- [ ] Verify booking status is `confirmed`
- [ ] Transaction: booking = `released`, `released_at = NOW()`, slot = `available`

> **Tags:** API · Primary exit path

---

### 8. Background Scheduler — Auto-Release and Expiry

Two periodic cron jobs handle slots that are never confirmed (no-show) and slots that exceed the 12-hour limit.

- [ ] Install `node-cron`
- [ ] Job 1 every 1 min: expire `pending` bookings past `expires_at`, set slot = `available`
- [ ] Job 2 every 5 min: auto-release `confirmed` bookings past `auto_release_at`, set slot = `available`
- [ ] Both jobs use bulk DB `UPDATE` — not row-by-row loops
- [ ] Log affected row count at INFO level — no PII in logs

> **Tags:** node-cron · Bulk DB updates — efficient at scale · No PII in logs

---

### 9. React Frontend

User-facing web app. Mobile-browser-friendly. Slot grid, booking flow, GPS confirm, and manual release.

- [ ] React Router: `/login`, `/slots`, `/my-bookings`
- [ ] Login page — "Sign in with w3id" button
- [ ] `SlotGrid` component — green (available), yellow (reserved), red (occupied)
- [ ] `BookingCard` component — status, Confirm Arrival, Release Slot buttons
- [ ] `confirmArrival()` — calls `navigator.geolocation` then `POST confirm` API
- [ ] `releaseSlot()` — `POST release` API
- [ ] 30-second slot status auto-refresh (polling or WebSocket)
- [ ] Redirect to `/login` on any 401 response

> **Tags:** React · navigator.geolocation · HTTPS required in prod

---

## Security Checklist

- [ ] w3id OIDC — no custom credentials
- [ ] All secrets in env variables, never in code
- [ ] `.gitignore` covers `.env` and secrets
- [ ] Session cookies: `httpOnly`, `secure`, `sameSite`
- [ ] All DB queries parameterized — no injection risk
- [ ] Server bound to `127.0.0.1` in dev; reverse proxy in prod
- [ ] HTTPS required in production (GPS API needs it)
- [ ] Structured JSON logs — no PII or sensitive data
- [ ] Input validation on all API request bodies

---

## Future Enhancements

> Out of scope for the initial release.

- Push notifications for nearby available slots
- Booking history and analytics per user
- Admin dashboard for slot management
- Re-booking abuse throttle (max 3 no-shows/day)
- Slack / Teams notification integration

---
