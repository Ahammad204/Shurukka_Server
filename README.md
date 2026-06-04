# Shurukka Server

Backend API for **Shurukka** — a community safety and incident reporting platform built for neighborhoods in Bangladesh. It powers incident reporting, lost & found listings, an emergency contacts directory, role-based moderation, notifications, and statistics dashboards.

The server is a Node.js/Express REST API backed by MongoDB, with JWT authentication, role-based access control, geospatial queries, and cron-ready auto-moderation utilities. It runs locally with `nodemon` and ships ready-to-deploy to Vercel as a serverless function.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [API Overview](#api-overview)
- [Data Models](#data-models)
- [Roles & Permissions](#roles--permissions)
- [Auto-Moderation](#auto-moderation)
- [Deployment](#deployment)
- [Security](#security)
- [Roadmap / Planned Endpoints](#roadmap--planned-endpoints)
- [Contributing](#contributing)
- [License](#license)

---

## Features

- **Authentication & Accounts** — Email/password registration and login with bcrypt-hashed passwords (12 salt rounds) and JWT-based sessions.
- **Role-Based Access Control** — Three roles (`user`, `moderator`, `admin`) with route-level guards and ownership checks.
- **Incident Reporting** — Citizens can file reports across categories (theft, accident, fire, suspicious activity, power/gas, flood/disaster, medical, other) with optional anonymity, photos (max 3), and GeoJSON coordinates.
- **Geospatial Search** — `2dsphere` indexes enable `$near` / `$geoWithin` queries for nearby incidents and lost & found posts.
- **Lost & Found** — Active listings with item categorization, optional contact reveal, and resolution flow.
- **Emergency Contacts Directory** — National hotlines and district-level contacts (police, hospital, fire, ambulance, electricity, gas, ward member). Includes a seeder for Bangladesh baseline data.
- **Notifications** — In-app notifications with per-recipient and broadcast support, unread counts, mark-as-read, and 30-day TTL.
- **Statistics** — Public counters for the home page and detailed admin dashboards.
- **Auto-Moderation Utilities** — Cron-ready helpers that auto-archive expired verified incidents and auto-block users with high rejection counts.
- **Security Hardening** — `helmet` headers, CORS allowlist with credentials, cookie parsing, and structured request validation via `express-validator`.
- **Observability** — `morgan` HTTP logging in development.

---

## Tech Stack

| Layer        | Technology                                                                 |
| ------------ | -------------------------------------------------------------------------- |
| Runtime      | Node.js `>=18`                                                             |
| Framework    | [Express](https://expressjs.com/) `^4.18`                                  |
| Database     | [MongoDB](https://www.mongodb.com/) via [Mongoose](https://mongoosejs.com/) `^7.5` |
| Auth         | [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken) `^9`, [bcryptjs](https://github.com/dcodeIO/bcrypt.js) `^2.4` |
| Security     | [helmet](https://helmetjs.github.io/) `^7`, [cors](https://github.com/expressjs/cors) `^2.8` |
| Validation   | [express-validator](https://express-validator.github.io/) `^7`            |
| Utilities    | [morgan](https://github.com/expressjs/morgan), [cookie-parser](https://github.com/expressjs/cookie-parser), [dotenv](https://github.com/motdotla/dotenv) |
| Dev          | [nodemon](https://nodemon.io/)                                             |
| Deployment   | [Vercel](https://vercel.com/) serverless (`@vercel/node`)                  |

---

## Project Structure

```
Shurukka-server/
├── index.js                  # Local entry point (starts HTTP server)
├── server.js                 # Vercel serverless entry (caches DB connection)
├── vercel.json               # Vercel build + routing config
├── package.json
├── .env.example
├── API_TESTING.md            # Postman testing guide
└── src/
    ├── app.js                # Express app: middleware, CORS, routes
    ├── config/
    │   └── db.js             # Mongoose connection
    ├── controllers/          # Route handlers
    │   ├── auth.controller.js
    │   ├── user.controller.js
    │   ├── incident.controller.js
    │   ├── lostfound.controller.js
    │   ├── emergency.controller.js
    │   ├── notification.controller.js
    │   └── stats.controller.js
    ├── middlewares/
    │   ├── auth.js           # JWT verification
    │   ├── roleCheck.js      # admin / moderator / active-user guards
    │   └── errorHandler.js   # Centralized error handler
    ├── models/               # Mongoose schemas
    │   ├── User.js
    │   ├── Incident.js
    │   ├── LostFound.js
    │   ├── EmergencyContact.js
    │   └── Notification.js
    ├── routes/               # Express routers (mounted under /api)
    │   ├── auth.routes.js
    │   ├── user.routes.js
    │   ├── incident.routes.js
    │   ├── lostfound.routes.js
    │   ├── emergency.routes.js
    │   ├── notification.routes.js
    │   └── stats.routes.js
    └── utils/
        ├── autoModerate.js   # Cron-ready moderation tasks
        └── notificationHelper.js
```

---

## Getting Started

### Prerequisites

- **Node.js** `>=18`
- **npm** (bundled with Node)
- **MongoDB** — local instance or a free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd Shurukka-server

# Install dependencies
npm install
```

### Configuration

Copy the example env file and fill in the values (see [Environment Variables](#environment-variables)):

```bash
cp .env.example .env
```

### Run

```bash
# Development (auto-reload via nodemon)
npm run dev

# Production
npm start
```

The API will be available at `http://localhost:5000` by default. Health check:

```bash
curl http://localhost:5000/
# { "success": true, "message": "Shurukka API is running. Use /api endpoints." }
```

---

## Environment Variables

| Variable          | Required | Default       | Description                                                                 |
| ----------------- | -------- | ------------- | --------------------------------------------------------------------------- |
| `PORT`            | No       | `5000`        | HTTP port for the local server. Ignored on Vercel.                          |
| `NODE_ENV`        | No       | `development` | `development` \| `production` \| `test`. Affects logging verbosity.          |
| `MONGODB_URI`     | **Yes**  | —             | Full MongoDB connection string (Atlas or local).                            |
| `JWT_SECRET`      | **Yes**  | —             | Secret used to sign and verify JSON Web Tokens.                             |
| `JWT_EXPIRES_IN`  | No       | `7d`          | Token lifetime (e.g. `1d`, `12h`, `7d`).                                    |
| `CLIENT_URL`      | No       | —             | Allowed CORS origin (typically the frontend dev URL).                       |
| `FRONTEND_URL`    | No       | —             | Secondary allowed CORS origin (typically the production frontend URL).     |
| `STRIPE_SECRET_KEY` | No     | —             | Reserved for funding/donation flows (see [Roadmap](#roadmap--planned-endpoints)). |

> The CORS allowlist is computed at startup as the union of `CLIENT_URL`, `FRONTEND_URL`, `http://localhost:5173`, and `https://alartnagar.netlify.app`.

---

## Available Scripts

| Command       | Description                                                    |
| ------------- | -------------------------------------------------------------- |
| `npm start`   | Start the server with Node.                                    |
| `npm run dev` | Start the server with `nodemon` for auto-reload during development. |

---

## API Overview

All routes are mounted under the `/api` prefix. Authenticated endpoints require `Authorization: Bearer <token>`.

| Mount Path                  | Purpose                                           | Router file                |
| --------------------------- | ------------------------------------------------- | -------------------------- |
| `/api/auth`                 | Register, login, current user                     | `auth.routes.js`           |
| `/api/users`                | Profile, admin user management                    | `user.routes.js`           |
| `/api/incidents`            | Incident reports, geospatial queries, moderation  | `incident.routes.js`       |
| `/api/lost-found`           | Lost & found listings                             | `lostfound.routes.js`      |
| `/api/emergency-contacts`   | Emergency directory                               | `emergency.routes.js`      |
| `/api/notifications`        | In-app notifications                              | `notification.routes.js`   |
| `/api/stats`                | Public counters & admin dashboard stats           | `stats.routes.js`          |

### Endpoints (high level)

**Auth** — `POST /register`, `POST /login`, `GET /me`

**Users**
- `PATCH /api/users/profile` — update own profile
- `GET /api/users` — list users (admin, supports `status`, `role`, `search`, `page`, `limit`)
- `GET /api/users/:id` — get user by id (admin)
- `PATCH /api/users/:id/status` — block/unblock (admin)
- `PATCH /api/users/:id/role` — change role (admin)
- `DELETE /api/users/:id` — delete user (admin, cascade-deletes their content)

**Incidents**
- `GET /api/incidents` — list verified incidents (`category`, `district`, `upazila`, `status`, `search`, pagination)
- `GET /api/incidents/my` — my reports
- `GET /api/incidents/nearby` — geospatial query
- `GET /api/incidents/:id`
- `POST /api/incidents` — create (active users)
- `PUT /api/incidents/:id` — update (owner or admin)
- `DELETE /api/incidents/:id` — delete (owner or admin)
- `PATCH /api/incidents/:id/status` — moderate (moderator/admin)
- `PATCH /api/incidents/:id/flag` — flag as suspicious

**Lost & Found**
- `GET /api/lost-found` — public listing
- `GET /api/lost-found/my` — my posts
- `GET /api/lost-found/nearby` — geospatial query
- `GET /api/lost-found/:id`
- `POST /api/lost-found`
- `PUT /api/lost-found/:id`
- `PATCH /api/lost-found/:id/resolve`
- `DELETE /api/lost-found/:id`

**Emergency Contacts**
- `GET /api/emergency-contacts` — public, with filters (`district`, `category`, `division`, `search`, pagination); national contacts appear first
- `GET /api/emergency-contacts/:id`
- `POST /api/emergency-contacts` — admin
- `PUT /api/emergency-contacts/:id` — admin
- `DELETE /api/emergency-contacts/:id` — admin
- `POST /api/emergency-contacts/seed` — admin; seeds Bangladesh baseline data

**Notifications**
- `GET /api/notifications`
- `GET /api/notifications/unread-count`
- `PATCH /api/notifications/mark-all-read`
- `PATCH /api/notifications/:id/read`
- `DELETE /api/notifications/:id`
- `DELETE /api/notifications/clear-all`

**Stats**
- `GET /api/stats/public` — verified incidents, active lost & found, total users
- `GET /api/stats/admin` — full dashboard metrics

> See [`API_TESTING.md`](./API_TESTING.md) for full request/response samples, headers, and a Postman workflow.

---

## Data Models

### `User`
- Identity: `name`, `email` (unique, lowercase), `passwordHash` (bcrypt, `select: false`)
- Profile: `avatar`, `phone`, `division`, `district`, `upazila`
- Access: `role` (`user` | `moderator` | `admin`), `status` (`active` | `blocked`)
- Moderation counters: `reportCount`, `rejectedCount`
- Methods: `comparePassword(plain)`

### `Incident`
- Reporter: `reporterId` (ref `User`), `reporterName`, `anonymous`
- Category: `theft`, `accident`, `fire`, `suspicious_activity`, `power_gas`, `flood_disaster`, `medical_emergency`, `other`
- Content: `title` (≤100), `description` (≥30 chars), `photos` (≤3)
- Location: `division`, `district`, `upazila`, `address`, GeoJSON `location` (2dsphere), `preciseAddress`, `hasMapLocation`, `locationMethod`
- Time: `incidentDate`, `incidentTime` (`HH:MM`)
- Moderation: `status` (`pending` | `under_review` | `verified` | `rejected` | `archived`), `flagCount`, `flaggedBy[]`, `moderatedBy`, `moderatedAt`, `rejectionReason`
- Lifecycle: `expiresAt` auto-set to `createdAt + 30 days` on verification

### `LostFound`
- Owner: `userId`, `userName`
- Type/category: `type` (`lost` | `found`), `category` (`electronics`, `documents`, `bag_wallet`, `jewelry`, `pet`, `other`)
- Content: `itemName`, `description`, `photo`
- Location: `division`, `district`, `upazila`, `exactPlace`, GeoJSON `location`, `preciseAddress`, `hasMapLocation`, `locationMethod`
- Date: `dateLostFound`
- Contact: `showContact` (bool), `contactNumber`
- Status: `active` | `resolved`

### `EmergencyContact`
- Identity: `name`, `category` (`police`, `hospital`, `fire_service`, `ambulance`, `electricity`, `gas`, `ward_member`, `other`)
- Coverage: `division`, `district`, `upazila`, `address`, `isNational`
- Contact: `phones[]` (≥1), `email`
- Metadata: `notes`, `createdBy` (ref `User`)

### `Notification`
- Routing: `recipientId`, `senderId`, `senderName`, `senderAvatar`
- Type: `new_incident`, `new_lost_found`, `incident_verified`, `incident_rejected`, `lost_found_resolved`
- Payload: `title`, `message`, `link`, `referenceId`, `referenceType` (`incident` | `lost_found`)
- State: `isRead`; TTL index expires documents after 30 days

---

## Roles & Permissions

| Capability                                    | user | moderator | admin |
| --------------------------------------------- | :--: | :-------: | :---: |
| Read verified incidents / public listings     |  ✓   |     ✓     |   ✓   |
| Create incidents / lost & found posts         |  ✓   |     ✓     |   ✓   |
| Edit/delete own content                       |  ✓   |     ✓     |   ✓   |
| Moderate incidents (`status`, publish)        |      |     ✓     |   ✓   |
| Manage emergency contacts                     |      |           |   ✓   |
| Manage users (list, status, role, delete)     |      |           |   ✓   |
| View admin statistics                         |      |           |   ✓   |
| Access funding/blog endpoints (planned)       |      |           |   ✓   |

Block logic: `verifyToken` rejects blocked accounts with HTTP `403`; `requireActiveUser` blocks creation/update flows for non-active users.

---

## Auto-Moderation

`src/utils/autoModerate.js` exposes two cron-ready functions:

- **`autoArchiveExpiredIncidents()`** — moves `verified` incidents whose `expiresAt` is in the past to `archived`.
- **`checkAndPenalizeUsers()`** — blocks any `active` user whose `rejectedCount` is `>= 5`.

Recommended schedule (e.g. via `node-cron`):

```js
const cron = require('node-cron');
const { autoArchiveExpiredIncidents, checkAndPenalizeUsers } = require('./src/utils/autoModerate');

cron.schedule('0 0 * * *', async () => {
  await autoArchiveExpiredIncidents();
  await checkAndPenalizeUsers();
});
```

Both functions log their outcomes to stdout and return the affected counts.

---

## Deployment

### Vercel (serverless)

The repository includes `vercel.json` and a separate `server.js` entry point that:

1. Caches the Mongoose connection on `global.__Shurukka_db` to avoid exhausting connections between cold starts.
2. Delegates all requests to the configured Express app.

Deploy:

```bash
# Install the Vercel CLI if you haven't
npm i -g vercel

# First-time deploy (follow prompts to link the project)
vercel

# Production deploy
vercel --prod
```

Set `MONGODB_URI`, `JWT_SECRET`, `CLIENT_URL`/`FRONTEND_URL`, and any other required env vars in the Vercel project settings.

### Other Node hosts

The standard `index.js` entry works on any Node `>=18` host (Render, Railway, Fly, a VM, etc.). Provide the same environment variables and run `npm start`.

---

## Security

- Passwords stored as bcrypt hashes (12 rounds) in `passwordHash`; the field is `select: false` by default.
- JWTs are signed with `JWT_SECRET`; tokens are validated on every protected route and expired/invalid tokens return `401`.
- `helmet` sets a baseline of secure HTTP headers.
- CORS is restricted to an allowlist of origins and supports `credentials: true` for cookie-based flows.
- `express-validator` is used for input validation on auth endpoints; controllers enforce ownership and role checks.
- Account-level blocking prevents banned users from issuing authenticated requests.

Production checklist before launch:

- Rotate `JWT_SECRET` to a high-entropy value and keep it out of source control.
- Restrict MongoDB network access (IP allowlist or private endpoints).
- Serve over HTTPS and set the appropriate `CLIENT_URL`/`FRONTEND_URL`.
- Add rate limiting (e.g. `express-rate-limit`) on auth and write-heavy endpoints.
- Configure structured logging and centralized error reporting.

---

## Roadmap / Planned Endpoints

The following capabilities are referenced in `API_TESTING.md` but not yet implemented as routers. They are scoped for upcoming releases:

- **Blogs** — `GET/POST/PUT/DELETE /api/blogs` with publish toggling, view counting, and slug-based public access.
- **Funding / Donations** — Stripe payment intents, confirmation, user funding history, and admin analytics.

Contributions to land these features are welcome — see [Contributing](#contributing).

---

## Contributing

1. Fork the repository and create a feature branch: `git checkout -b feature/awesome-thing`.
2. Install dependencies and run `npm run dev` against a local MongoDB.
3. Keep changes focused; follow the existing controller/route/model layout.
4. Validate inputs with `express-validator` where appropriate and use the role-check middlewares for new protected routes.
5. Make sure `npm start` boots cleanly and that lint/typecheck passes (configure your preferred toolchain).
6. Open a pull request with a clear description of the change and any new env vars or scripts.

---

## License

Released under the [MIT License](./package.json). See `package.json` for the canonical declaration.
