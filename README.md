# Career Journey Tracker

A web application that helps faculty advisors and career advisors track the career readiness of CS majors and AI Certificate students at York College.

> **Important:** This application holds real student records. Treat all data as FERPA-protected and confidential.

## Tech Stack

| Technology | What it does |
|---|---|
| [Next.js](https://nextjs.org) + [React](https://react.dev) | Web framework for building the UI |
| [TypeScript](https://www.typescriptlang.org) | JavaScript with type safety — catches errors before runtime |
| [PostgreSQL](https://www.postgresql.org) | Relational database that stores all app data |
| [Prisma](https://www.prisma.io) | ORM — makes it easier to query the database from TypeScript |
| [Auth.js](https://authjs.dev) | User authentication and session management |
| [Tailwind CSS](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com) | Utility-first styling and pre-built UI components |
| [Zod](https://zod.dev) | Input validation — ensures data is correct before it hits the database |
| [Docker Compose](https://www.docker.com) | Runs the PostgreSQL database locally in a container |
| [Vitest](https://vitest.dev) | Fast unit and integration testing |

## Features

- **Student Roster** — View, search, and manage student records. Import students via CSV (safe to re-import — matched by CUNY EMPLID).
- **Milestones** — Track career milestones like internships, certifications, and hackathons. Milestone types are stored in the database, so new types can be added without code changes.
- **Portfolio** — Store and review student portfolio items and projects.
- **Notes** — Add advisor notes to a student's record for tracking conversations and progress.
- **Career Readiness** — Calculate a readiness score based on completed milestones and portfolio items.
- **AI Summary** — Generate an AI-powered summary of a student's career progress (triggered manually, cached in the database, uses only the York campus LiteLLM proxy).
- **Analytics** — Dashboard views and aggregate reporting across students.
- **Exports** — Export student data to CSV for reporting.
- **Admin** — Manage lookup tables (milestone types, note types, programs) and system configuration.

## How It Works

1. **You log in** — Auth.js handles authentication. Your role (faculty, advisor, admin) determines what you can see and do.
2. **Pages fetch data** — Each page queries PostgreSQL through Prisma. Large queries are paginated so the app stays fast.
3. **Changes are logged** — Every read of student details and every write is recorded in an audit log (who, what, when) for FERPA compliance.
4. **Imports are safe** — CSV imports use the student's CUNY EMPLID as a unique key. Re-importing the same file won't create duplicates.

## Project Structure

```
src/
├── app/                  # Page routes — thin files that check permissions, fetch data, and render UI
├── features/             # Where the real logic lives
│   └── <feature-name>/
│       ├── queries.ts        # Read data from the database
│       ├── actions.ts        # Write data to the database (authenticated)
│       ├── schemas.ts        # Zod validation schemas
│       ├── types.ts          # TypeScript type definitions
│       └── components/       # UI components specific to this feature
├── lib/                  # Shared utilities (auth, DB client, logging, environment config, etc.)
└── components/ui/        # Pre-built UI components (buttons, inputs, modals) — managed by shadcn
```

Every feature follows the same file layout. If you're adding a new feature, look at an existing one as a template.

## Getting Started

### Prerequisites

- Node.js 20+ and npm
- Docker Desktop (for the local database)

### Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables** — Copy the example file and fill in the values:
   ```bash
   cp .env.example .env
   ```
   Then edit `.env` and fill in `AUTH_SECRET` (generate with `openssl rand -base64 32`) and `LITELLM_API_KEY`. The rest can stay as-is for local development.

3. **Start the database** — Spins up a PostgreSQL container via Docker:
   ```bash
   npm run db:up
   ```

4. **Create database tables** — Runs Prisma migrations:
   ```bash
   npm run db:migrate
   ```

5. **Seed initial data** — Populates lookup tables (milestone types, programs, etc.):
   ```bash
   npm run db:seed
   ```

6. **Start the dev server** — Opens the app at http://localhost:3000:
   ```bash
   npm run dev
   ```

### Useful Commands

| Command | What it does |
|---|---|
| `npm run dev` | Start the development server (http://localhost:3000) |
| `npm run build` | Build for production |
| `npm run start` | Run the production build |
| `npm run db:up` | Start the PostgreSQL database in Docker |
| `npm run db:down` | Stop the database container |
| `npm run db:migrate` | Apply pending database migrations |
| `npm run db:studio` | Open Prisma Studio — a GUI to browse and edit database data |
| `npm run db:seed` | Seed the database with initial lookup data |
| `npm run typecheck` | Run TypeScript compiler to check for type errors |
| `npm run test` | Run the test suite |
| `npm run test:watch` | Run tests in watch mode (re-runs on file changes) |
| `npm run lint` | Run ESLint to check for code issues |
| `npm run format` | Auto-format code with Prettier |

### Before You Commit

Run these to make sure everything is clean:

```bash
npm run typecheck
npm run test
```

## Contributing

This codebase is handed to a new student developer each year. Keep these conventions in mind:

- **`src/app/` is for routing only.** If a page gets long, move logic to `src/features/`.
- **Every feature uses the same 4+1 file pattern:** `queries.ts`, `actions.ts`, `schemas.ts`, `types.ts`, `components/`.
- **Prefer shadcn components** over hand-rolling UI elements.
- **Don't add dependencies** without a good reason — every package is a maintenance cost for the next student.
- **No student PII in logs, error messages, or test fixtures.**

For detailed architecture rules, see [AGENTS.md](./AGENTS.md).
