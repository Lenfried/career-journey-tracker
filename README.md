# Career Journey Tracker

A web application that helps faculty advisors and career advisors track the career readiness of CS majors and AI Certificate students at York College.

> **Right now this application contains no real student data.** It runs on a set of fictional fixture records and shows a DEMO DATA banner on every page. It is designed to hold FERPA-protected records eventually, so treat the code as if it already does — but do not deploy it anywhere a real student record could reach it until authentication exists.

## Where the project is

The project is being built **fixture-driven**: we agreed on the shape of a student record first, wrote realistic sample records against that shape, and are building the application on top of them. The real data source — a Navigate360 export, a CUNYFirst integration, advisor manual entry, or some combination — has not been decided yet, and this approach means we do not have to wait for that decision to start building.

**Phase 1 (done): read-only.** Canonical schema, 18 fixture students, the service layer, and three screens — dashboard, student roster, student profile. Plus the AI advisor summary, pulled forward from Phase 2.

**Week 2 (next): write operations.** Add a note, log a milestone, add a skill, update readiness status, edit a career goal, add a student.

**Phase 2 (later): authentication, CSV import, analytics, admin, export.**

## How it works

The whole architecture is three layers, and the boundary between them is the most important thing in the codebase:

```
UI layer                →  Service layer               →  Data source
src/app/, components/      src/features/*/queries.ts      src/lib/fixtures.ts
```

1. **Pages call the service layer.** A page in `src/app/` works out what it needs, calls a query function, and renders a component. It never touches the data source.
2. **The service layer is the contract.** `src/features/students/queries.ts` and friends are the only things that know where data comes from.
3. **The data source is swappable.** Today `src/lib/fixtures.ts` reads a JSON file. When a real source is available, that one file changes and nothing above it does.

That last point is the whole reason for the split. If a component reads the fixture file directly, it has to be rewritten when the data source changes — which is how a "swap the data source" task becomes a rewrite.

**What the data looks like** is written down in [`docs/canonical-schema.md`](docs/canonical-schema.md), with the machine-readable version in [`src/lib/canonical.ts`](src/lib/canonical.ts). Read the first one before you write any feature code.

## Tech Stack

| Technology                                                                   | What it does                                                                               |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| [Next.js](https://nextjs.org) + [React](https://react.dev)                   | Web framework for building the UI                                                          |
| [TypeScript](https://www.typescriptlang.org)                                 | JavaScript with type safety — catches errors before runtime                                |
| [Zod](https://zod.dev)                                                       | Validates the fixture data against the canonical schema, and (later) form and action input |
| [Tailwind CSS](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com) | Utility-first styling and pre-built UI components                                          |
| [Vitest](https://vitest.dev)                                                 | Fast unit tests                                                                            |

Installed and configured, but **not used by any code path yet** — these are staged for Phase 2, so don't be confused when you find them: [PostgreSQL](https://www.postgresql.org), [Prisma](https://www.prisma.io), [Auth.js](https://authjs.dev), [Docker Compose](https://www.docker.com).

## Features

Built and working:

- **Dashboard** — Student count, who is overdue for follow-up, and who was updated most recently.
- **Student roster** — Every student, sorted by surname, searchable by name or EMPLID.
- **Student profile** — Four tabs:
  - _Overview_ — identity, career goal, and the four-item readiness artifact checklist (résumé, LinkedIn, GitHub, portfolio).
  - _Notes_ — advising notes, newest first, with follow-up dates.
  - _Milestones_ — internships, jobs, research, leadership, workshops, career fairs, networking.
  - _Skills_ — what the student has next to what the target role requires, with the gap between them highlighted.
  - _AI summary_ — a written briefing for the advisor, generated on request and cached.

Read-only for now. Every screen fetches on the server; there is almost no client-side JavaScript.

### AI advisor summary

An advisor presses a button and gets a written briefing on where the student stands, with recommendations specific to their stated goal — roughly the ten minutes it takes to read the other four tabs before a meeting.

Four things about it are worth knowing before you touch it, and all four are explained in [`docs/ai-summary.md`](docs/ai-summary.md):

- **The model is not trusted with facts.** Every count is computed in application code and handed to the model finished. It interprets and writes; it does not recall or count.
- **The student is not identified.** No name, EMPLID, email, advisor, bio or artifact links go into the payload. Advising notes are filtered by an `aiEligible` flag on the note type that defaults to off, so crisis and referral notes are never sent.
- **It is cached, and it tells you when it is out of date.** Generation happens only on the button press. A fingerprint over the payload detects when the record has changed since.
- **It works with no API key.** The proxy is not reachable off campus, so without a key the feature produces clearly-labelled sample output instead of crashing.

Nothing is sent anywhere except the York LiteLLM proxy.

## Project Structure

```
fixtures/
└── students.json         # The development dataset — 18 fictional students
docs/
└── canonical-schema.md   # What a student record is. Read this first.
src/
├── app/                  # Routes only — check permission, call a query, render a component
├── features/             # Where the logic lives, one folder per canonical data group
│   └── <feature-name>/
│       ├── queries.ts        # Reads — the service layer
│       ├── actions.ts        # Writes (empty in Phase 1)
│       ├── schemas.ts        # Zod validation
│       ├── types.ts          # View models — what the UI receives
│       └── components/       # UI for this feature
├── lib/                  # Cross-cutting
│   ├── canonical.ts          # The canonical schema. Source of truth.
│   ├── fixtures.ts           # The data source. The only file that knows where data lives.
│   ├── summary-store.ts      # Where generated summaries live. Also a data source.
│   ├── ai.ts                 # The LiteLLM client. The only module that calls a model.
│   ├── env.ts                # Environment configuration, Zod-validated at boot
│   ├── authz.ts              # authedAction() — a placeholder, read the comment first
│   ├── lookups.ts            # Resolving lookup ids to labels
│   ├── labels.ts             # Display labels for the fixed vocabularies
│   └── dates.ts              # Calendar dates vs timestamps — they are not the same thing
└── components/ui/        # Pre-built UI components — managed by shadcn
```

The features are `students`, `goals`, `skills`, `readiness`, `notes`, `milestones`, `dashboard`, and `summary`. Every one has the same five files. If you're adding a feature, copy the shape from an existing one.

## Getting Started

### Prerequisites

Node.js 20+ and npm. **No database, no Docker, no environment variables** — that is the point of building fixture-first.

The AI summary is the one feature that can use configuration, and it is optional. Without `LITELLM_API_KEY` it produces clearly-labelled sample output, which is also what you get off campus, where the proxy does not resolve. To use the real thing, copy `.env.example` to `.env`, set the key, and be on the campus network.

### Setup

```bash
npm install
npm run dev
```

Open http://localhost:3000.

That is the whole setup. The 18 fixture students load from `fixtures/students.json` automatically.

### Useful Commands

| Command              | What it does                                         |
| -------------------- | ---------------------------------------------------- |
| `npm run dev`        | Start the development server (http://localhost:3000) |
| `npm run build`      | Build for production                                 |
| `npm run start`      | Run the production build                             |
| `npm run typecheck`  | Run TypeScript compiler to check for type errors     |
| `npm run test`       | Run the test suite                                   |
| `npm run test:watch` | Run tests in watch mode (re-runs on file changes)    |
| `npm run lint`       | Run ESLint to check for code issues                  |
| `npm run format`     | Auto-format code with Prettier                       |

Phase 2 commands — these work, but nothing uses the database yet: `db:up`, `db:down`, `db:migrate`, `db:studio`, `db:seed`.

## Working with the fixtures

The fixture set is not random fake data. Each of the 18 students is carrying a display state the application has to handle correctly — a student with nothing started, one overdue for follow-up, one with a large skills gap, one with no career goal, one with a preferred name, one with a very long advising note, one with exactly one of everything.

`src/lib/fixtures.test.ts` asserts that every one of those states is still present. If you delete a student and that test fails, it is telling you that an empty state or an edge case just stopped being exercised — put the coverage back, don't delete the assertion.

To change the shape of the data: edit `src/lib/canonical.ts`, update `fixtures/students.json` so every record still validates, update `docs/canonical-schema.md`, and run the tests. The schema is expected to change once we see real data. Make the change in one commit and say what prompted it.

### Before You Commit

```bash
npm run typecheck
npm run test
```

## Contributing

This codebase is handed to a new student developer each year. Keep these in mind:

- **Nothing outside `src/features/*/queries.ts` reads the data source.** No page, no component, imports `lib/fixtures`. This is the constraint that lets real data drop in later without a rewrite — it is worth being pedantic about in code review.
- **`src/app/` is for routing only.** If a page gets past about 40 lines, move the logic to `src/features/`.
- **Every feature uses the same five files:** `queries.ts`, `actions.ts`, `schemas.ts`, `types.ts`, `components/`.
- **Prefer shadcn components** over hand-rolling UI elements, unless the shadcn one is a Client Component and the usage is static — then hand-roll and leave a comment saying why.
- **Don't add dependencies** without a good reason. Every package is a maintenance cost for the next student.
- **No student PII in logs, error messages, or test fixtures.** Nor in anything sent to a model — see [`docs/ai-summary.md`](docs/ai-summary.md).

For the detailed rules, see [AGENTS.md](./AGENTS.md).
