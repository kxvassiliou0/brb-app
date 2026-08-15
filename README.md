# Leave Booking System

A leave booking application built as a React + TypeScript frontend on top of an
Express + TypeORM backend.

- **Frontend** - Vite, React 19, TypeScript (strict), Tailwind CSS v4, React
  Router 7, Vitest + React Testing Library, Cypress.
- **Backend** - Express 5, TypeORM, MySQL, JWT auth, Jest.

## Prerequisites

- Node.js 22 or newer
- npm 10 or newer
- A running MySQL server (backend only)

## Repository layout

```
.
├── src/            React application
├── cypress/        End-to-end specs
├── backend/        Express API (own package.json, own npm install)
└── .env.example    Frontend environment template
```

The frontend and backend are separate npm packages. Each needs its own
`npm install`.

## Backend setup

The frontend expects the API on **port 3000**, so start the backend first.

```bash
cd backend
npm install
cp .env.example .env
```

Fill in `backend/.env`:

| Variable          | Purpose                                      |
| ----------------- | -------------------------------------------- |
| `DB_HOST`         | MySQL host, e.g. `127.0.0.1`                 |
| `DB_PORT`         | MySQL port, e.g. `3306`                      |
| `DB_USERNAME`     | MySQL user                                   |
| `DB_PASSWORD`     | MySQL password                               |
| `DB_NAME`         | Database name, e.g. `leave_booking`          |
| `PASSWORD_PEPPER` | Secret mixed into password hashing           |
| `JWT_SECRET_KEY`  | Secret used to sign and verify auth tokens   |
| `RATE_LIMIT_MAX`  | Requests allowed per 15 minutes, default 500 |

Create the database, then seed it and start the API:

```bash
npm run seed
npm run dev
```

The API listens on `http://localhost:3000`.

### Backend scripts

| Command                 | Description                     |
| ----------------------- | ------------------------------- |
| `npm run dev`           | Start with auto-reload          |
| `npm start`             | Start once                      |
| `npm run seed`          | Populate the database           |
| `npm test`              | Run the Jest suite              |
| `npm run test:coverage` | Run Jest with coverage          |
| `npm run typecheck`     | Type-check without emitting     |
| `npm run lint`          | Run ESLint                      |
| `npm run format`        | Format with Prettier            |
| `npm run format:check`  | Fail if anything is unformatted |

## Frontend setup

From the repository root:

```bash
npm install
cp .env.example .env
npm run dev
```

Vite serves the app on `http://localhost:5173`.

### Environment variables

The API base URL is read from the environment - it is never hard-coded in the
client. Set it in `.env`:

```
VITE_API_URL=http://localhost:3000
```

Only variables prefixed with `VITE_` are exposed to the browser. If
`VITE_API_URL` is unset, `src/lib/api.ts` falls back to
`http://localhost:3000`. `.env` is gitignored; `.env.example` is the tracked
template.

### Frontend scripts

| Command                | Description                                     |
| ---------------------- | ----------------------------------------------- |
| `npm run dev`          | Start the Vite dev server                       |
| `npm run build`        | Type-check and build for production             |
| `npm run preview`      | Serve the production build                      |
| `npm run typecheck`    | Type-check app, Node and Cypress projects       |
| `npm run lint`         | Run ESLint                                      |
| `npm run format`       | Format with Prettier                            |
| `npm run format:check` | Fail if anything is unformatted                 |
| `npm test`             | Run the Vitest suite once                       |
| `npm run test:watch`   | Run Vitest in watch mode                        |
| `npm run cypress:open` | Open the Cypress runner                         |
| `npm run test:e2e`     | Start the dev server and run Cypress headlessly |

Backend scripts are also reachable from the root as `npm run backend:dev`,
`backend:seed`, `backend:test`, `backend:lint`, `backend:typecheck`,
`backend:format` and `backend:format:check`.

## Running the full stack

Use two terminals:

```bash
# terminal 1
npm run backend:dev

# terminal 2
npm run dev
```

Then sign in at `http://localhost:5173/login` with a seeded account.

## Design system

Colour and type tokens live in the `@theme` block of `src/index.css`, and the
shared loading, empty and error components live in `src/components/states`.
Both are catalogued in [`docs/tokens.md`](docs/tokens.md) - read that before
building a new screen so states stay consistent rather than being reinvented
per feature.

## Leave day counting

`POST /api/leave-requests` counts **calendar days**, not working days. A request
from Friday to Monday is charged as four days - weekends are chargeable.

Public holidays are the one exception. A range that contains a public holiday is
accepted and the holiday is **excluded** from `days_requested`, so it is not
charged against the employee's allowance. The reduced figure is what gets
validated against the remaining balance and what the record stores.

> **Behaviour change.** A range containing a public holiday used to be rejected
> outright with `400`. It is now accepted with a smaller `days_requested`, which
> changes the meaning of that figure: it is the number of _chargeable_ days, no
> longer the raw length of the range. Historic rows created before this change
> still hold the raw length.

The create response reports what was excluded so the UI can explain the number:

```json
{
  "message": "Leave request has been submitted for review",
  "data": {
    "id": 12,
    "employee_id": 4,
    "leave_type": "Vacation",
    "start_date": "2026-12-23",
    "end_date": "2026-12-28",
    "status": "Pending",
    "days_requested": 5,
    "excluded_public_holidays": [
      { "date": "2026-12-25", "name": "Christmas Day" }
    ]
  }
}
```

A range made up entirely of public holidays is still rejected with `400`, since
it would book no leave at all.

`GET /api/public-holidays` remains available to any signed-in user so the date
picker can grey out those dates before the request is submitted.

## Testing

### Unit and component tests

Vitest runs in a jsdom environment with React Testing Library and
`@testing-library/jest-dom` matchers, configured in `vite.config.ts` and
`src/test/setup.ts`.

```bash
npm test
```

### End-to-end tests

Cypress specs live in `cypress/e2e` and run against
`http://localhost:5173`.

```bash
npm run cypress:open   # interactive
npm run test:e2e       # headless, boots the dev server itself
```

## Code style

ESLint (flat config, `eslint.config.js`) covers correctness; Prettier owns
formatting. `eslint-config-prettier` is applied last so the two never disagree.
The frontend and backend each have their own `.prettierrc.json` - the backend
keeps semicolons and double quotes, the frontend does not.

## Continuous integration

`.github/workflows/ci.yml` runs type-check, lint and tests for the frontend and
backend on every push and pull request against `main`.
