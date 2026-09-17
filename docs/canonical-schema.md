# Canonical Schema

The agreed shape of a student record inside the Career Journey Tracker.

This is **not** a database schema. It is the contract between the UI, the service
layer, and whatever data source sits behind the service layer. It is expected to
evolve once we see real data from Navigate360 / CUNYFirst — treat it as a target
shape, not a guarantee.

The machine-readable version of everything below lives in
[`src/lib/canonical.ts`](../src/lib/canonical.ts) as Zod schemas. That file is the
source of truth; this page is the human explanation. If the two disagree, the Zod
schema wins and this page needs updating.

## Conventions

- **Ids** are opaque strings. Fixture ids look like `stu_amara_okonkwo`; a real
  source will supply its own.
- **Calendar dates** (`sessionDate`, `completedDate`, `followUpDate`) are
  `YYYY-MM-DD` strings with no time and no zone. They are calendar facts — the day
  an advising session happened does not shift when you read it from another
  timezone.
- **Timestamps** (`updatedAt`, `lastDiscussedAt`) are full ISO-8601 instants and
  render in `America/New_York`.
- **Optional means absent.** A field that is not known is `null`, never `""`.
  Empty string is a value; `null` is the absence of one.

## Lookups, not enums

Milestone types, note types, programs, and readiness artifact types are **lookup
tables** — they live in the fixture data (later, in the database), not in
TypeScript unions. Adding a tenth milestone type must not require a deploy.

Records reference them by id (`typeId`, `programId`). Resolve to a label through
the service layer.

The vocabularies that _are_ fixed unions are the ones with ordinal meaning that
the UI reasons about — proficiency, importance, artifact status, classification.
Those are not configuration.

## The seven data groups

### 1. Student identity

| Field              | Type                                                           | Notes                                                            |
| ------------------ | -------------------------------------------------------------- | ---------------------------------------------------------------- |
| `id`               | string                                                         | Primary key                                                      |
| `emplid`           | string                                                         | CUNY EMPLID. The natural key any real import matches on          |
| `firstName`        | string                                                         | Legal first name                                                 |
| `lastName`         | string                                                         |                                                                  |
| `preferredName`    | string \| null                                                 | When present, **display this everywhere** instead of `firstName` |
| `email`            | string                                                         |                                                                  |
| `programId`        | string                                                         | → `lookups.programs`                                             |
| `classification`   | `freshman` \| `sophomore` \| `junior` \| `senior`              |                                                                  |
| `enrollmentStatus` | `enrolled` \| `leave-of-absence` \| `graduated` \| `withdrawn` |                                                                  |
| `advisor`          | string \| null                                                 | Assigned advisor's name                                          |
| `bio`              | string \| null                                                 | Free-text advisor context                                        |
| `entryTerm`        | academic term (`YYYYFA`, `YYYYSP`, or `YYYYSU`)                | First term at York; anchors the start of this student's map      |
| `updatedAt`        | timestamp                                                      | Drives the dashboard "recently updated" list                     |

Likely to evolve: **low**. These are stable across any source.

### 2. Career goal

At most one per student. `null` when the student has not set one — this is a
common, expected state, not an error.

| Field             | Type                        | Notes                                            |
| ----------------- | --------------------------- | ------------------------------------------------ |
| `statement`       | string                      | Free text, in the student's words                |
| `targetIndustry`  | string \| null              |                                                  |
| `targetRole`      | string \| null              |                                                  |
| `timeline`        | string \| null              | Free text — "by Spring 2027", "after graduation" |
| `confidence`      | `low` \| `medium` \| `high` | How settled the student is                       |
| `lastDiscussedAt` | timestamp \| null           |                                                  |
| `advisorNotes`    | string \| null              | Advisor's read on the goal                       |

Likely to evolve: **low**. Advisor-entered, source-independent.

### 2b. Career-map assignment and progress

The career map has a two-level taxonomy: a broad **track** and an optional,
focused **specialization** beneath it. See
[`career-map-taxonomy.md`](./career-map-taxonomy.md) for the full template
contract, migration notes, and the AI-integration boundary.

| Field                 | Type              | Notes                                                           |
| --------------------- | ----------------- | --------------------------------------------------------------- |
| `trackId`             | string \| null    | → top-level `careerTracks`; `null` means still exploring        |
| `trackSetAt`          | timestamp \| null | Set exactly when `trackId` is set                               |
| `specializationId`    | string \| null    | → `careerSpecializations`; must be a child of `trackId`         |
| `specializationSetAt` | timestamp \| null | Set exactly when `specializationId` is set                      |
| `progress`            | progress[]        | Sparse advisor-confirmed state, keyed only by stable `actionId` |

A specialization requires a track, but a track does not require a
specialization. This permits a student to choose a broad direction before
committing to a narrower path. Progress never keys on either taxonomy level, so
changing a path does not erase completed work.

### 3a. Skills — student has

| Field               | Type                                                      | Notes                                                  |
| ------------------- | --------------------------------------------------------- | ------------------------------------------------------ |
| `id`                | string                                                    |                                                        |
| `name`              | string                                                    | Free text. See normalisation below                     |
| `category`          | `technical` \| `soft` \| `domain` \| `tool` \| `language` |                                                        |
| `proficiency`       | `beginner` \| `intermediate` \| `advanced`                |                                                        |
| `evidence`          | string \| null                                            | Where the skill came from — a course, a job, a project |
| `verifiedByAdvisor` | boolean                                                   |                                                        |

### 3b. Skills — path or advisor requires

| Field        | Type                                         | Notes                        |
| ------------ | -------------------------------------------- | ---------------------------- |
| `id`         | string                                       |                              |
| `name`       | string                                       |                              |
| `category`   | same union as above                          |                              |
| `importance` | `nice-to-have` \| `important` \| `essential` |                              |
| `rationale`  | string \| null                               | Why the target role needs it |

**The gap is derived, never stored.** A required skill is "covered" when the
student has a skill whose _normalised_ name matches — trimmed and lowercased.
Without that, `Python`, `python `, and `Python` from two different advisors are
three different skills. Normalisation lives in `normaliseSkillName()` in
`src/lib/canonical.ts` so read and write use the same rule.

Specialization requirements and advisor-added student requirements are merged.
When names normalize to the same value, the advisor-added row wins because it
contains student-specific context. Broad tracks do not own required skills.

Likely to evolve: **medium**. Names will need real normalisation work once a
source pre-populates them.

### 4. Readiness artifacts

Four of them, one per type in `lookups.artifactTypes` (resume, LinkedIn, GitHub,
portfolio).

| Field          | Type                                                    | Notes                     |
| -------------- | ------------------------------------------------------- | ------------------------- |
| `typeId`       | string                                                  | → `lookups.artifactTypes` |
| `status`       | `none` \| `in-progress` \| `needs-review` \| `complete` | Ordered, worst to best    |
| `url`          | string \| null                                          |                           |
| `advisorNotes` | string \| null                                          |                           |

A student record may omit artifact rows entirely. The service layer fills the
missing types in at status `none`, so the checklist always renders all four.

Likely to evolve: **low**.

### 5. Advising notes

| Field          | Type         | Notes                  |
| -------------- | ------------ | ---------------------- |
| `id`           | string       |                        |
| `sessionDate`  | date         |                        |
| `typeId`       | string       | → `lookups.noteTypes`  |
| `content`      | string       | Free text, can be long |
| `followUpDate` | date \| null |                        |
| `recordedBy`   | string       |                        |

**Overdue follow-up** is derived: a student is overdue when their _most recent_
note (by `sessionDate`) has a `followUpDate` strictly before today in
`America/New_York`. Only the most recent note counts — an old note with a stale
follow-up date is history, not a task.

Likely to evolve: **low**.

### 6. Career milestones

| Field           | Type           | Notes                      |
| --------------- | -------------- | -------------------------- |
| `id`            | string         |                            |
| `typeId`        | string         | → `lookups.milestoneTypes` |
| `title`         | string         |                            |
| `completedDate` | date           |                            |
| `description`   | string \| null |                            |
| `recordedBy`    | string         |                            |

Likely to evolve: **low**.

### 7. Lookups

```
lookups.programs        [{ id, label }]
lookups.noteTypes       [{ id, label }]
lookups.milestoneTypes  [{ id, label }]
lookups.artifactTypes   [{ id, label }]
```

`artifactTypes` is ordered; the readiness checklist renders in that order.

## Changing this schema

1. Edit the Zod schema in `src/lib/canonical.ts`.
2. Update `fixtures/students.json` so every record still validates.
3. Update this page.
4. `npm run test` — the fixture validation test will fail loudly if a record
   drifted.

Schema changes are expected. Make them in version control, in one commit, with a
note on what real-data observation prompted the change. During the current
experimental/demo phase, a validated product-model decision can also prompt a
change; document the migration and downstream integration impact in the same
commit.
