# AGENTS.md — Career Journey Tracker

Context for AI coding agents (opencode, Claude Code, Copilot). Humans should read
`docs/` instead — this file is deliberately terse.

## What this is

Career readiness tracker for CS majors and AI Certificate students at York College.
Used by faculty advisors and career advisors. **It holds real student records —
treat everything here as FERPA-protected data.**

## Stack

Next.js (App Router) · TypeScript strict · Prisma · PostgreSQL · Tailwind v4 ·
shadcn/ui · Zod · Auth.js · Vitest · Docker Compose.

Runs on a campus Linux VM. Development happens in WSL2 on Windows.

## Layout rules — follow these exactly

- **`src/app/` is routing only.** Page files check permission, call a query,
  render a component. If a `page.tsx` passes ~40 lines, the logic belongs in
  `src/features/`.
- **`src/features/<name>/` holds all logic**, and every feature has the same
  four files: `queries.ts` (reads), `actions.ts` (writes), `schemas.ts` (Zod),
  `components/`. Do not invent a new shape for a new feature.
- **`src/lib/`** is cross-cutting only: `db`, `env`, `auth`, `authz`, `audit`,
  `logger`, `csv`, `ai`.
- `src/components/ui/` is shadcn-generated. Prefer adding a new shadcn component
  over hand-rolling one.

## Non-negotiable rules

1. **Every mutation is wrapped in `authedAction(roles, fn)`** from `lib/authz.ts`.
   A bare Server Action is a public HTTP endpoint. No exceptions.
2. **Every read of student detail and every write calls `writeAudit()`.**
   FERPA requires knowing who saw what, when.
3. **Roster queries paginate in Postgres.** Never `findMany()` the whole student
   table and filter in JS. Use `take`/`skip` + indexed `where`.
4. **No secrets in code.** Everything goes through `lib/env.ts`, which validates
   `process.env` with Zod at boot.
5. **No student PII in logs, error messages, or test fixtures.** Log IDs, not names.
6. **AI summaries are generated on explicit user action and cached** in the
   `career_summary` table with model name + prompt version. Never on page render.
7. **Lookup tables, not hardcoded enums**, for milestone types, note types, and
   programs. Adding a 10th milestone type must not require a deploy.
8. **Imports are idempotent upserts keyed on CUNY EMPLID.** Re-running an import
   must never duplicate a student.

## Conventions

- Server Components for data fetching; `'use client'` only when you need state,
  effects, or event handlers. Push client boundaries as low as possible.
- Zod schema in `schemas.ts` is the single source of truth — reuse it for the
  form resolver, the action input, and CSV row validation.
- Dates: store `timestamptz`, render in `America/New_York`.
- Prefer `async/await`. No `.then()` chains.

## Commands

```bash
npm run dev          # dev server
npm run db:up        # Postgres in Docker
npm run db:migrate   # prisma migrate dev
npm run db:studio    # browse data
npm run db:seed
npm run typecheck    # tsc --noEmit
npm run test
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
