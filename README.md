# Parking Lot System

**Stack:** React · Node.js / Express · PostgreSQL · w3id (OIDC) · GPS Confirmation

---

## Table of Contents

1. [System Rules](#system-rules)
2. [Booking State Machine](#booking-state-machine)
3. [Local Setup & Getting Started](#local-setup--getting-started)
4. [Data Models](#data-models)
5. [API Endpoints](#api-endpoints)
6. [Sub-Tasks Completed](#sub-tasks-completed)
7. [Security Checklist](#security-checklist)
8. [Future Enhancements](#future-enhancements)

---

## System Rules

| Rule | Detail |
|---|---|
| **Booking Window** | Only within 15 min of arrival |
| **Arrival Confirmation** | GPS must place you inside the lot boundary (150m geofence) |
| **Auto-Release — No-show** | Slot freed if not GPS-confirmed within 15 min |
| **Auto-Release — Overstay** | Slot freed after 12 hours regardless |
| **Manual Release** | User frees slot from the app when leaving |
| **Multi-Booking Quota** | Max of **2 active slot reservations** per user at any time |
| **Payment** | None (Free company perk) |
| **Authentication** | w3id SSO only (OIDC) + Dev Mock Auth for local testing |

---

## Booking State Machine

```
        AVAILABLE SLOT
              │
       user books slot (Max 2 active slots/user)
              │
           PENDING
              │
    ┌─────── 15-minute GPS confirmation window ────────┐
    │                                                   │
No GPS confirm in 15 min                   GPS confirms within 15 min
    │                                                   │
 EXPIRED                                           CONFIRMED
    │                                        (Slot is yours — up to 12 hours)
slot = available                    ┌──────────────────┴──────────────────┐
                               User releases manually            12 hours pass
                                       │                                   │
                                   RELEASED                         AUTO-RELEASED
                                       │                                   │
                               slot = available                    slot = available
```

---

## Local Setup & Getting Started

### Prerequisites

- **Node.js**: v18.0.0 or higher (Tested with Node v20/v26)
- **npm**: v9.0.0 or higher
- *(Optional)* **PostgreSQL**: PostgreSQL 14+ (if not running, the system automatically uses an in-memory database fallback for seamless development and instant zero-config testing!)

---

### Step 1: Clone and Install Dependencies

```bash
# Clone repository
git clone <repo-url>
cd Parking-Lot-System

# Install all monorepo dependencies (server + client)
npm install
```

---

### Step 2: Configure Environment Variables

Copy the `.env.example` file to create your `.env`:

```bash
cp .env.example .env
```

Default configuration in `.env`:
```env
# Server
PORT=5001
HOST=127.0.0.1
NODE_ENV=development
CLIENT_URL=http://127.0.0.1:3000

# PostgreSQL (Auto-falls back to in-memory if unreachable)
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/parking_lot

# Session Secret (min 32 characters in production)
SESSION_SECRET=dev-insecure-secret-key-change-in-prod-min-32-chars

# Dev Auth Mode (Set true for instant mock login)
DEV_AUTH_ENABLED=true

# Parking Lot Geolocation Boundary
PARKING_LOT_NAME=HQ Tech Park - Lot A
PARKING_LOT_LAT=37.774929
PARKING_LOT_LNG=-122.419416
PARKING_LOT_RADIUS_METERS=150
```

---

### Step 3: Start the Application

You can start both the backend API server and the React frontend simultaneously with a single command:

```bash
npm run dev
```

- **Frontend App**: [http://127.0.0.1:3000](http://127.0.0.1:3000)
- **Backend API**: [http://127.0.0.1:5001](http://127.0.0.1:5001)
- **Health Check**: [http://127.0.0.1:5001/health](http://127.0.0.1:5001/health)

---

### Step 4: Run Automated Tests

Run the complete end-to-end test suite (GPS Haversine calculations, API security, quota limits, cron jobs, auth):

```bash
npm test
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
| `slot_number` | VARCHAR | e.g. `"A-01"` |
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
| `GET` | `/health` | Service health & parking lot boundary info | 200 JSON |
| `GET` | `/api/slots` | List all slots with live status & filter | 200 — array of slots |
| `POST` | `/api/bookings` | Reserve a slot (max 2 active) — 15-min expiry | 201 created / 400 limit / 409 conflict |
| `GET` | `/api/bookings/my` | List current user's active & past bookings | 200 — array of bookings |
| `POST` | `/api/bookings/:id/confirm` | GPS arrival confirm — activates slot | 200 / 403 not at lot / 410 expired |
| `POST` | `/api/bookings/:id/release` | Manually free your slot when leaving | 200 / 403 not owner |
| `GET` | `/auth/login` | Redirect to w3id OIDC login | 302 redirect |
| `GET` | `/auth/callback` | OIDC callback — sets session cookie | 302 redirect to app |
| `POST` | `/auth/dev-login` | Instant simulated login for development | 200 JSON |
| `GET` | `/auth/me` | Current authenticated session info | 200 JSON |
| `POST` | `/auth/logout` | Destroy session | 200 JSON |

---

## Sub-Tasks Completed

### 1. Project Scaffolding and Repository Structure
- [x] Create monorepo root with `package.json`
- [x] Scaffold `/client` with Vite + React + Tailwind CSS
- [x] Scaffold `/server` with Express — `routes/`, `controllers/`, `services/`, `models/`, `middleware/`
- [x] Add `.env.example` with all required keys
- [x] Add `.gitignore` covering `node_modules`, `.env`, build artifacts

### 2. Database Setup and Migrations
- [x] Migration: `users` table
- [x] Migration: `parking_slots` table with status constraint
- [x] Migration: `bookings` table with FK constraints
- [x] Indexes on `bookings(status, expires_at)` and `bookings(status, auto_release_at)`
- [x] Dev seed script — 20 sample parking slots + demo user

### 3. w3id Authentication (OIDC) & Dev Mock Mode
- [x] Configure OIDC strategy with `openid-client` and `passport`
- [x] Upsert user in DB on login using `w3id` as unique key
- [x] Set session with `httpOnly`, `secure`, `sameSite` cookie flags
- [x] Create `requireAuth` middleware — returns 401 if no session
- [x] Implement `/auth/login`, `/auth/callback`, `/auth/dev-login`, `/auth/logout`

### 4. Parking Slot Listing API
- [x] Create `GET /api/slots` (protected by `requireAuth`)
- [x] Query `parking_slots` joined with active bookings for live status
- [x] Return `id`, `slot_number`, `status`, `location_lat`, `location_lng` per slot
- [x] Support optional `?status=` filter query param

### 5. Booking Creation API & Quota Limit
- [x] `POST /api/bookings` with body `{ slot_id }`
- [x] DB transaction: check user active quota (max 2), check slot availability, insert booking, update slot to `reserved`
- [x] Set `expires_at = NOW() + 15 minutes` (server-side only)
- [x] Return 201 on success / 400 quota exceeded / 409 if slot is taken

### 6. GPS Arrival Confirmation API
- [x] `POST /api/bookings/:id/confirm` with body `{ lat, lng }`
- [x] Read `PARKING_LOT_LAT`, `PARKING_LOT_LNG`, `PARKING_LOT_RADIUS_METERS` from env
- [x] Implement Haversine distance formula in `gpsService` utility
- [x] Return 410 Gone if booking has already expired
- [x] Return 403 if user is outside the lot radius
- [x] On success: `confirmed_at = NOW()`, `auto_release_at = NOW() + 12 hrs`, slot = `occupied`

### 7. Slot Release API
- [x] `POST /api/bookings/:id/release`
- [x] Verify booking belongs to `req.user` — return 403 if not
- [x] Verify booking status is `confirmed`
- [x] Transaction: booking = `released`, `released_at = NOW()`, slot = `available`

### 8. Background Scheduler — Auto-Release and Expiry
- [x] Install `node-cron`
- [x] Job 1 every 1 min: expire `pending` bookings past `expires_at`, set slot = `available`
- [x] Job 2 every 5 min: auto-release `confirmed` bookings past `auto_release_at`, set slot = `available`
- [x] Both jobs use bulk DB `UPDATE` — not row-by-row loops
- [x] Log affected row count at INFO level — no PII in logs

### 9. React Frontend
- [x] React Router: `/login`, `/slots`, `/my-bookings`
- [x] Login page — w3id SSO + Dev quick login
- [x] `SlotGrid` component — green (available), yellow (reserved), red (occupied)
- [x] `BookingCard` component — status countdown timers, Confirm Arrival, Release Slot buttons
- [x] `GPSConfirmModal` — browser `navigator.geolocation` + developer GPS simulation controls
- [x] 30-second slot status auto-refresh with live countdown
- [x] Active quota indicators (max 2 active slots)

---

## Security Checklist

- [x] w3id OIDC — no custom credentials in production
- [x] All secrets in env variables, never in code
- [x] `.gitignore` covers `.env` and secrets
- [x] Session cookies: `httpOnly`, `secure`, `sameSite`
- [x] All DB queries parameterized — no injection risk
- [x] Server bound to `127.0.0.1` (never 0.0.0.0)
- [x] Structured JSON logs — no PII or sensitive data
- [x] Input validation on all API request bodies

---

## Future Enhancements

- Push notifications for nearby available slots
- Booking history and analytics per user
- Admin dashboard for slot management
- Re-booking abuse throttle (max 3 no-shows/day)
- Slack / Teams notification integration
