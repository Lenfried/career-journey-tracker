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
student roster, student profile (overview / notes / milestones / skills).

What does not exist yet, in order: write operations (Week 2), then auth, CSV
import, analytics, AI summaries, admin, and export (Phase 2).

Because there is no authentication, **this application must not be deployed
anywhere a real student record could reach it.** That constraint lifts when
rule 1 below is actually implemented, not before.

## Stack

Next.js (App Router) · TypeScript strict · Tailwind v4 · shadcn/ui · Zod · Vitest.

Prisma, PostgreSQL, Auth.js, Docker Compose and the LiteLLM client are installed
and configured but **not used by any Phase 1 code path**. They are staged for
Phase 2. Do not wire them in to solve a Phase 1 problem.

Runs on a campus Linux VM. Development happens in WSL2 on Windows.

## Skills

Agent skills live in `.agents/skills/`, one directory per skill with a `SKILL.md`
entrypoint. `.claude/skills/` holds nothing but symlinks to them:

```
.agents/skills/prisma-cli/SKILL.md            # the real file
.claude/skills/prisma-cli -> ../../.agents/skills/prisma-cli
```

All twelve follow this. Add a skill in `.agents/skills/`, then symlink it —
never the other way round. opencode reads `.agents/skills/` directly; Claude
Code only reads `.claude/skills/`, which is what the symlink is for.

The entrypoint must be named exactly `SKILL.md` and its `name:` must match the
directory. A browser-renamed `SKILL (1).md` fails silently — no error, the skill
just never loads.

Symlinks need `git config core.symlinks true` and Developer Mode on native
Windows. Inside WSL2 they work as-is. If a skill's file looks like one line of
text reading `../../.agents/skills/...`, that is what went wrong.

Present: `code-review-and-quality`, `code-simplification`,
`frontend-ui-engineering`, and nine `prisma-*` API references.

A skill's body loads only when the task matches it. That is what keeps it out of
this file — put a procedure in a skill, put a rule in here.

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
  dashboard, which owns no data and composes the others.
- **`src/lib/`** is cross-cutting only. Present: `canonical` (the schema),
  `fixtures` (the data source), `lookups`, `labels`, `dates`, `utils`. Staged for
  Phase 2: `db`, `env`, `auth`, `authz`, `audit`, `logger`, `csv`, `ai`.
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

1. _(Phase 2 — binds the moment the first Server Action is written.)_
   **Every mutation is wrapped in `authedAction(roles, fn)`** from `lib/authz.ts`.
   A bare Server Action is a public HTTP endpoint. No exceptions.
2. _(Phase 2, with rule 1.)_ **Every read of student detail and every write calls
   `writeAudit()`.** FERPA requires knowing who saw what, when.
3. _(Phase 2, when Postgres arrives.)_ **Roster queries paginate in Postgres.**
   Never `findMany()` the whole student table and filter in JS. Use an indexed
   `where` with `take`/`skip`. Phase 1 filters ~18 fixture records in memory,
   which is fine at that size and is exactly what must not survive the switch to
   a real source — `listStudents()` is the one function to revisit.
4. **Now.** **No secrets in code.** Everything goes through `lib/env.ts`, which
   validates `process.env` with Zod at boot.
5. **Now.** **No student PII in logs, error messages, or test fixtures.** Log IDs,
   not names. Fixture records are fictional by construction: `.invalid` emails
   and EMPLIDs in the unissued `99xxxxxx` block, asserted in
   `src/lib/fixtures.test.ts`.
6. _(Phase 2.)_ **AI summaries are generated on explicit user action and cached**
   in the `career_summary` table with model name + prompt version. Never on page
   render.
7. **Now.** **Lookup tables, not hardcoded enums**, for milestone types, note
   types, programs, and readiness artifact types. Adding a 10th milestone type
   must not require a deploy. In Phase 1 these live in `lookups` in the fixture
   file; resolve them with `resolveLabel()` from `lib/lookups.ts`. The fixed
   unions in `lib/canonical.ts` (proficiency, importance, artifact status,
   classification) are _not_ lookups — the UI reasons about their order, so
   changing them is a design change, not configuration.
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
  is in `docs/canonical-schema.md` and the development plan; charts, imports and
  AI summaries are on the far side of it.
- Don't remove the DEMO DATA banner while the app is reading fixtures. It is what
  stops a screenshot from being mistaken for real student records.
