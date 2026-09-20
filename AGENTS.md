# AGENTS.md — Career Journey Tracker

Context for AI coding agents (opencode, Claude Code, Copilot). Humans should read
`docs/` instead — this file is deliberately terse.

## What this is

Career readiness tracker for CS majors and AI Certificate students at York College.
Used by faculty advisors and career advisors. It is **designed to hold real student
records — treat everything here as FERPA-protected data**, including while the only
data in it is fictional.

## Where the project is right now

**Phase 1: fixture-driven, read-only.** There is no database, no authentication,
and no real student data. The application reads `fixtures/students.json` and
renders it. This is deliberate — see `docs/canonical-schema.md` and the
fixture-driven development plan.

What exists: canonical schema, fixture dataset, service-layer reads, dashboard,
student roster, student profile (overview / notes / milestones / skills / AI
summary).

The AI advisor summary was pulled forward out of Phase 2 deliberately. It reads
through the service layer like everything else, caches to a file rather than a
table, and degrades to labelled sample output with no API key. Its rules are in
`docs/ai-summary.md` — read that before touching anything under
`src/features/summary/`, `lib/ai.ts` or `lib/summary-store.ts`.

What does not exist yet, in order: write operations (Week 2), then auth, CSV
import, analytics, admin, and export (Phase 2).

Because there is no authentication, **this application must not be deployed
anywhere a real student record could reach it.** That constraint lifts when
rule 1 below is actually implemented, not before.

## Stack

Next.js (App Router) · TypeScript strict · Tailwind v4 · shadcn/ui · Zod · Vitest.

Prisma, PostgreSQL, Auth.js and Docker Compose are installed and configured but
**not used by any Phase 1 code path**. They are staged for Phase 2. Do not wire
them in to solve a Phase 1 problem.

The LiteLLM client is the exception — it is live, behind `lib/ai.ts`, for the
advisor summary. It is the only module allowed to call a model endpoint.

Runs on a campus Linux VM. Development happens in WSL2 on Windows.

**Next 16 and React 19 are not the versions you have memorised.** Both diverge
from what a model trained on Next 13/14 will confidently produce — Server
Components, caching and `revalidate*` have all moved. Version-exact docs for the
release in `package.json` ship on disk at `node_modules/next/dist/docs/`; read
the relevant page there rather than recalling an API. Worth knowing before you
touch anything:

- `01-app/02-guides/server-actions.md` — read it before writing an action. It
  reaches the same conclusion rule 1 below does, in Vercel's words: "the route
  is reachable to anyone who can send the same POST. Treat every action as an
  untrusted entry point."
- `01-app/03-api-reference/04-functions/revalidatePath.md` — the `type`
  parameter is required for route patterns (`/students/[id]`) and must be
  omitted for literal paths (`/students/stu_okonkwo_amara`).
- `01-app/03-api-reference/01-directives/use-client.md` — before adding a client
  boundary.

`next dev` offers to write a version of this note into AGENTS.md itself. It is
switched off in `next.config.ts` (`agentRules: false`) with the reasoning there;
this paragraph is the replacement, and it stays accurate by hand.

## The architecture rule

```
UI          →   service layer               →   data source
src/app/        src/features/*/queries.ts       src/lib/fixtures.ts
components/
```

**Nothing in `src/app/` or in any `components/` directory may import
`lib/fixtures`.** All data access goes through a feature's `queries.ts`.

This is the single most important constraint in the codebase. It is what lets
the fixture file be swapped for a Navigate360 ingest, a CUNYFirst adapter, or
Postgres by changing one file instead of every component. A component that reads
the data source directly has to be rewritten when the source changes — enforce
this in code review from day one.

## Layout rules — follow these exactly

- **`src/app/` is routing only.** Page files check permission, call a query,
  render a component. If a `page.tsx` passes ~40 lines, the logic belongs in
  `src/features/`.
- **`src/features/<name>/` holds all logic**, and every feature has the same
  files: `queries.ts` (reads), `actions.ts` (writes), `schemas.ts` (Zod),
  `types.ts` (view models), `components/`. Do not invent a new shape for a new
  feature. The seven features are `students`, `goals`, `skills`, `readiness`,
  `notes`, `milestones`, `dashboard` — one per canonical data group, plus the
  dashboard, which owns no data and composes the others. `summary` is an eighth
  of the same kind: it owns no canonical data and composes the rest. It carries
  one extra file, `prompt.ts`, because a versioned prompt is an artifact rule 6
  requires us to track and burying it in `queries.ts` hides it.
- **`src/lib/`** is cross-cutting only. Present: `canonical` (the schema),
  `fixtures` (the data source), `lookups`, `labels`, `dates`, `utils`, `env`,
  `ai`, `authz` (a placeholder — read the comment block before trusting it), and
  `summary-store`. Staged for Phase 2: `db`, `auth`, `audit`, `logger`, `csv`.
  `summary-store` has the same standing as `fixtures`: it is a data source, so
  no page and no component may import it.
- **`fixtures/students.json`** is the dataset. Every student in it covers a
  display state the UI must handle; `src/lib/fixtures.test.ts` fails if one of
  those states stops being represented. Read that test before deleting a record.
- `src/components/ui/` is shadcn-generated. Prefer adding a new shadcn component
  over hand-rolling one — except where the shadcn version is a Client Component
  and the usage is static (the roster table, the profile tabs). Say so in a
  comment when you make that call.

## Non-negotiable rules

Each is marked with when it binds. A rule marked _Phase 2_ is not optional later
— it is unenforceable now because the thing it governs does not exist yet.

1. _(Binding now — the first Server Action was written for the AI summary.)_
   **Every mutation is wrapped in `authedAction(roles, fn)`** from `lib/authz.ts`.
   A bare Server Action is a public HTTP endpoint. No exceptions. The wrapper
   exists but does not enforce anything yet — there is no authentication to
   enforce with. It is at every call site so Phase 2 fills in one function
   instead of auditing every action ever written. This does not relax the rule
   that the app must not be deployed where a real record could reach it.
2. _(Phase 2, with rule 1.)_ **Every read of student detail and every write calls
   `writeAudit()`.** FERPA requires knowing who saw what, when.
3. _(Phase 2, when Postgres arrives.)_ **Roster queries paginate in Postgres.**
   Never `findMany()` the whole student table and filter in JS. Use an indexed
   `where` with `take`/`skip`. Phase 1 filters ~18 fixture records in memory,
   which is fine at that size and is exactly what must not survive the switch to
   a real source — `listStudents()` is the one function to revisit.
4. **Now.** **No secrets in code.** Everything goes through `lib/env.ts`, which
   validates `process.env` with Zod at boot. It validates only the variables a
   live code path reads — adding `DATABASE_URL` before anything reads it would
   make a missing `.env` a startup failure and break the "no environment
   variables needed" promise. Extend it in the commit that adds the reader.
5. **Now.** **No student PII in logs, error messages, or test fixtures.** Log IDs,
   not names. Fixture records are fictional by construction: `.invalid` emails
   and EMPLIDs in the unissued `99xxxxxx` block, asserted in
   `src/lib/fixtures.test.ts`.
6. **Now.** **AI summaries are generated on explicit user action and cached**
   with model name + prompt version. Never on page render. Phase 1 caches to
   `lib/summary-store.ts` (a file per student) rather than the `career_summary`
   table; the interface is two functions so the swap is one file. Two further
   rules that bind with it: assemble the payload in code and never let the model
   supply a number, and send nothing that identifies the student. See
   `docs/ai-summary.md`.
7. **Now.** **Lookup tables, not hardcoded enums**, for milestone types, note
   types, programs, and readiness artifact types. Adding a 10th milestone type
   must not require a deploy. In Phase 1 these live in `lookups` in the fixture
   file; resolve them with `resolveLabel()` from `lib/lookups.ts`. The fixed
   unions in `lib/canonical.ts` (proficiency, importance, artifact status,
   classification) are _not_ lookups — the UI reasons about their order, so
   changing them is a design change, not configuration. A lookup row may also
   carry policy: note types have `aiEligible`, which decides whether notes of
   that type may be sent to a model. It defaults to `false` and must keep
   defaulting to `false`.
8. _(Phase 2, when import exists.)_ **Imports are idempotent upserts keyed on
   CUNY EMPLID.** Re-running an import must never duplicate a student.

## Conventions

- Server Components for data fetching; `'use client'` only when you need state,
  effects, or event handlers. Push client boundaries as low as possible.
- Zod is the single source of truth for shape. The canonical record lives in
  `lib/canonical.ts`; a feature's `schemas.ts` re-exports its slice and adds that
  feature's own input schemas. Reuse those for the form resolver, the action
  input, and CSV row validation.
- Every service-layer function is `async`, even where the fixture read is
  synchronous. That is the seam a real data source slots into without touching
  callers. Do not "simplify" it away.
- Dates have two kinds and they are not interchangeable. Calendar dates
  (`sessionDate`, `completedDate`, `followUpDate`) are `YYYY-MM-DD` strings —
  format with `formatCalendarDate()`, compare with `<`, never with `new Date()`,
  which parses them as UTC midnight and renders the previous day in New York.
  Timestamps (`updatedAt`, `lastDiscussedAt`) are ISO instants rendered in
  `America/New_York` via `formatTimestamp()`. Both live in `lib/dates.ts`.
- Derive, don't store. The skills gap, the readiness progress, and the overdue
  follow-up flag are all recomputed on read. A stored copy goes stale the first
  time something writes through a path that forgets to update it.
- Prefer `async/await`. No `.then()` chains.

## Commands

```bash
npm run dev          # dev server
npm run typecheck    # tsc --noEmit
npm run test         # vitest
npm run lint
npm run build

# Phase 2 — Postgres is not used by any Phase 1 code path.
npm run db:up        # Postgres in Docker
npm run db:migrate   # prisma migrate dev
npm run db:studio    # browse data
npm run db:seed
```

## Before you say you're done

Run `npm run typecheck` and `npm run test`. Do not report a task complete with
type errors outstanding.

## Things not to do

- Don't add a dependency without saying why in the commit message. This codebase
  gets handed to a new student every year — every package is a tax on them.
- Don't introduce Redis, a queue service, or a second deployable. If background
  work is genuinely needed, use `pg-boss` on the existing database.
- Don't send student data to any model endpoint other than the York LiteLLM proxy.
- Don't read `lib/fixtures` from a page or a component. See the architecture rule.
- Don't treat the canonical schema as final. It will change the first time anyone
  sees a real Navigate360 export. Change it in one commit — schema, fixtures,
  `docs/canonical-schema.md` — and say what real-data observation prompted it.
- Don't build Phase 2 features to make a Phase 1 screen nicer. The MVP boundary
  is in `docs/canonical-schema.md` and the development plan; charts and imports
  are on the far side of it. The AI summary was pulled across on purpose and is
  the exception, not the precedent.
- Don't send a student's name, EMPLID, email, advisor, bio or artifact URLs to a
  model, and don't send a note whose type is not `aiEligible`. The redaction
  boundary is `assembleSummaryInput()` and the tests around it are the point of
  the tests, not decoration.
- Don't render or accept a free-text field that reaches a model without
  `<AiVisibilityBadge />` next to it. Today that is `goal.advisorNotes` and
  `requiredSkills[].rationale`; both are free text with no type, so the
  `aiEligible` filter cannot reach them and the advisor writing them is the only
  control. Labelling some and not others is worse than labelling none — an
  advisor who sees the badge on one field concludes the unlabelled one is
  private. If you add a free-text field to the payload, label it in the same
  commit.
- Don't remove the DEMO DATA banner while the app is reading fixtures. It is what
  stops a screenshot from being mistaken for real student records.
