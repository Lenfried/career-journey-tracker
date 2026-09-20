# AI-assisted advisor summary

An advisor opens a student's profile, presses a button, and gets a written
briefing: where the student stands and what to raise in the meeting. It is meant
to save the ten minutes an advisor otherwise spends reading four tabs.

This page is the human explanation. The rules an agent needs are in
[`AGENTS.md`](../AGENTS.md); the shape of a student record is in
[`canonical-schema.md`](./canonical-schema.md).

## What it does

One summary, per student, generated on request and cached. It reads the career
goal, the skills-versus-requirements gap, the readiness artifacts, the
milestones and the recent advising notes, and reasons about them together. A
recommendation is supposed to be specific to that student's stated goal —
"SQL is essential for the target role and is not in their skills" rather than
"update your résumé".

The output is written **to the advisor, about the student**. It is never shown
to the student, and the model is told so.

Out of scope, deliberately: student-facing views, batch generation across a
cohort, streaming, embeddings, chat, and anything scheduled.

## Where the pieces are

```
src/features/summary/
  queries.ts     Assembly, redaction, fingerprinting, the stub. The service layer.
  actions.ts     generateSummary() — the Server Action behind the button.
  schemas.ts     What we send (summaryInputSchema) and what we accept back.
  prompt.ts      The prompt text and PROMPT_VERSION.
  types.ts       View models.
  components/    The panel (server) and the button (client).

src/lib/
  ai.ts             The LiteLLM client, JSON extraction, schema validation.
  env.ts            Zod-validated configuration.
  authz.ts          authedAction() — see the caveat below.
  summary-store.ts  Where summaries are kept.
```

The feature owns no canonical data. Like `dashboard`, it composes the other
features' `queries.ts` and never imports `lib/fixtures`. That is why moving to
Postgres will not touch it: it already reads through the same seam every screen
does.

## What is sent to the model, and what is not

The payload is assembled in `assembleSummaryInput()`, which is the redaction
boundary. What is absent from it matters more than what is in it.

**Sent:** program, classification and enrolment status; the career goal with its
confidence and advisor notes; held skills with category and proficiency;
required skills with importance and rationale; the derived gap; artifact types
with their statuses; milestones with type, title and description; eligible
advising notes; and whether a follow-up is overdue.

**Not sent, and why:**

| Left out                                                          | Reason                                                                                                                                    |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `id`, `emplid`, `firstName`, `lastName`, `preferredName`, `email` | A model does not need to know who someone is to observe that their target role wants SQL and they do not have it.                         |
| `advisor`, and `recordedBy` on notes and milestones               | Staff names are not needed to reason about readiness.                                                                                     |
| `bio`                                                             | Unstructured advisor context. It could hold anything.                                                                                     |
| Artifact `url`                                                    | A portfolio or GitHub URL is very often the student's real name or handle. This is the field that would quietly put the identity back in. |
| Skill `evidence`                                                  | Free text, frequently naming an employer or a specific course section.                                                                    |
| All absolute dates                                                | Replaced with `daysAgo` / `monthsAgo` integers computed in code, so the model has no date arithmetic to get wrong.                        |

Every count — milestone totals, artifacts complete, skills covered, the gap
itself — is computed in application code and handed over finished. The model
interprets and writes; it does not recall or count. If a summary says "two
internships", that number came from `assembleSummaryInput()`.

`src/features/summary/queries.test.ts` serialises the payload for every fixture
student and asserts that none of these values appear anywhere in it, at any
depth. It is written that way so a field added later cannot quietly carry a name
through.

### Advising notes

Note types carry an `aiEligible` flag in the lookup table. Only notes whose type
is eligible are sent.

| Note type | Eligible |                                                              |
| --------- | -------- | ------------------------------------------------------------ |
| Academic  | yes      |                                                              |
| Career    | yes      |                                                              |
| Check-in  | yes      |                                                              |
| Crisis    | **no**   | Financial hardship, withdrawal deliberation, personal crisis |
| Referral  | **no**   | Support-service referrals, including emergency funds         |

Two things about this are deliberate:

**It is an allowlist, and it fails closed.** A note type with no flag defaults to
ineligible. Adding a tenth note type — say "Accommodations" — excludes it from
model calls until somebody marks it eligible on purpose. A blocklist would have
included it silently, and the cost of that mistake is not symmetric.

**It is data, not code.** The flag lives on the lookup row, so deciding a new
note type is career-relevant is configuration rather than a deploy. That is
rule 7 in AGENTS.md applied to policy as well as labels.

The payload carries a **count** of withheld notes even though it carries none of
their content. This does two jobs: the model is told that notes exist which it
cannot see, so it does not write "no other concerns are recorded" about a
student with two crisis notes; and the advisor sees "2 advising notes were
withheld" under the summary, so they can tell the difference between "there is
nothing else" and "there is something else, on the Notes tab".

Notes are also capped at the five most recent eligible ones, each truncated to
1,200 characters.

### Free-text fields, and why they are labelled

Redaction of notes is **type-based**, and type-based filtering only works on
fields that have a type. Two free-text fields have none, and both are sent:

- `goal.advisorNotes` — the advisor's read on the career goal
- `requiredSkills[].rationale` — why the role needs a skill

They are sent because they are what makes a recommendation specific to the
student rather than generic careers advice. For one fixture student
`advisorNotes` reads _"Torn between ML engineering and data science. Worth
another conversation."_ — that single sentence is the difference between a
briefing that knows what the meeting is about and one that does not. Dropping
these fields measurably degrades the feature.

That leaves one control: the person typing. So every free-text field that
reaches a model carries `<AiVisibilityBadge />` from
`src/components/ai-visibility-badge.tsx`, reading **"Included in AI summaries"**,
rendered next to the field wherever it appears. The badge is one component so
the wording cannot drift between places — two wordings of the same promise are
two promises.

Two rules come with it:

- **Label all of them or none.** An advisor who sees the badge on one field will
  reasonably conclude the unlabelled one is private. Partial labelling is worse
  than none.
- **Labelling belongs at the point of entry.** Phase 1 is read-only, so the
  badge currently sits on the display surfaces — the career goal card and the
  required-skill rows. When Week 2 builds the goal form, it goes on the
  `advisorNotes` textarea, which is the moment that actually matters: the only
  moment anybody knows whether what they are about to type belongs in a career
  briefing. The reminder is planted in `src/features/goals/actions.ts` and
  `schemas.ts`, where whoever writes that form will hit it.

**What this does not do.** It is guidance, not a filter. An advisor who types a
crisis disclosure into `advisorNotes` will still have it sent. The worked
example is `stu_voznyak_oleksandr`: his crisis note ("Withdrawal conversation.
Referred to financial aid and to the emergency grant programme… Nine credits
short of the degree.") is correctly withheld, but his `advisorNotes` reads
"Nine credits short." and is sent, alongside `enrollmentStatus: Withdrawn` and
the goal statement "Finish the degree." The most sensitive parts — the financial
aid referral, the emergency fund, the deliberation itself — did not go. A fair
amount of the situation still can be inferred.

If that turns out to be unacceptable, the structural fix is to drop
`advisorNotes` from the payload: one line in `assembleSummaryInput()`, one test,
and a more generic summary. What is not worth doing is regex or classifier
scrubbing for crisis vocabulary — brittle, it mangles legitimate text, and it
produces confidence that the problem is handled when it is not.

## Caching

Generation happens only when an advisor presses the button. Never on page
render — that would be slow, would burn tokens on every visit, and would mean
the summary quietly changed under two advisors looking at the same student.

Summaries are stored one JSON file per student under `.cache/ai-summaries/`,
gitignored, written atomically. `src/lib/summary-store.ts` is the only module
that knows that; it exposes `readSummary()` and `writeSummary()` and nothing
else, so replacing it with the `career_summary` table is one file.

A file rather than an in-memory map because the dev server reloads modules on
every edit, and a summary that vanishes when you change a component cannot be
evaluated. It also means you can open the JSON and read what the model actually
produced while tuning the prompt.

Each stored summary records the **model name** and the **prompt version**
(rule 6), both shown in the footer under the summary.

## Staleness

A cached summary goes out of date when the record behind it changes. Detected
with a fingerprint: a SHA-256 over the assembled payload, stored alongside the
summary and recompared on every page load. "Stale" therefore means exactly _the
model would see different facts now_.

This is better than comparing `updatedAt`, which is student-level, cannot
distinguish a change the payload saw from one it did not, and in fixture mode
never moves at all — a staleness feature built on it could not even be
demonstrated.

**Time-relative values are stripped before hashing.** `daysAgo` on a note
increases every night. Fingerprinting it would mark every summary in the system
stale each morning, and a banner that is always on is a banner advisors learn to
ignore. `followUp.overdue` is kept, because it flips once and the flip genuinely
changes the briefing; `daysOverdue` is dropped, being the same fact counted
higher.

One consequence worth knowing: because the payload carries a _count_ of withheld
sensitive notes, logging a crisis note **does** mark the summary stale — without
that note's content ever entering the payload.

Two staleness reasons are distinguished, because an advisor does something
different about each:

- _The record has changed_ — the advice may now be wrong.
- _The prompt has changed_ — the advice is fine but was written to an older brief.

Neither regenerates automatically. Both show a banner and enable the button.

## Running without the proxy

`LITELLM_API_KEY` is optional. With no key, the feature runs a **stub provider**
instead of calling a model: it builds a summary from the real assembled payload,
so every count in it is true, but the prose is flat placeholder text and every
line is marked `Sample text.`

The stored record carries `model: "stub"`, and the UI puts an unmissable SAMPLE
OUTPUT bar above it. A placeholder that could be mistaken for a real summary is
the single worst thing this feature could produce, so it is labelled in the
data, in the store, and on the screen.

This is what makes the feature demonstrable off campus, where
`llm.york.cuny.edu` does not resolve.

## Handling what the model returns

`generateJson()` in `lib/ai.ts` asks for `response_format: json_object`, then
assumes it did not get it. In order: strip markdown code fences, find the outer
braces (models prepend "Here is the summary you asked for:"), `JSON.parse` in a
try/catch, then validate against the Zod schema.

On a malformed or off-shape response it retries **once** with a correction, then
gives up. One retry, not three: a model that misses the shape twice is not going
to find it on the fourth attempt, and the advisor is already waiting.

Failures are returned as values, never thrown, and each maps to a message that
says whose problem it is — an unreachable proxy sends the advisor to the campus
network, a schema failure is ours.

The output schema caps every string length and every array, so a model that will
not stop writing cannot break the page. Every array may be **empty**, which is
load-bearing — see below.

Nothing in a failure message or a log line contains the payload or the response
content. The payload is the student's record; a log line is forever.

## Empty records

Some students have nothing recorded: no goal, no skills, no milestones, no
notes. `stu_lindqvist_tobias` is the fixture case and is tested directly.

For those, the payload carries `isEmptyRecord: true`, and the prompt requires
empty `strengths`, `gaps` and `recommendations`, one or two plain sentences of
`standing`, and a populated `dataGaps` — what the advisor should collect. The
schema permits empty arrays specifically so "there is nothing here" is a
representable answer rather than something the model has to pad around. The UI
then adds a line noting that empty is the expected result for an empty record.

Three paragraphs spun out of nothing would be worse than no summary at all.

## The UI

A fifth tab on the student profile, `?tab=summary`, following the same
server-rendered link pattern as the other four. The only client component is the
button; generation takes ten to thirty seconds, so it shows a spinner and says
how long it usually takes, which is what stops an advisor pressing it twice.

The **AI-generated disclaimer is not dismissible**, sits above the content rather
than below it, and renders on every summary including stubs. An advisor may act
on this or paste it into a meeting record, and the claim that a model wrote it
has to travel with it.

## Caveats

- **`authedAction()` does not enforce anything yet.** `generateSummary()` is the
  first Server Action in this codebase, which is the moment rule 1 starts
  binding, so the wrapper is in place at the call site. There is no
  authentication to enforce with, so it calls through and warns in production.
  Read the comment block in `src/lib/authz.ts` before relying on it. The standing
  constraint is unchanged: this application must not be deployed anywhere a real
  student record could reach it.
- **No audit logging.** Rule 2 requires `writeAudit()` on every read of student
  detail and every write. `lib/audit.ts` does not exist. Generating a summary is
  exactly the kind of event that will need auditing, and the call belongs inside
  `authedAction()` when it is written.
- **The cache is per-machine.** Fine for a single VM; it does not survive a
  container rebuild and would not be shared across replicas. That goes away with
  the `career_summary` table.
- **If this is ever run as more than one instance, set
  `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`** to the same value on every instance.
  Next encrypts Server Action references per build, and without a shared key a
  load-balanced deployment fails intermittently as requests land on an instance
  that cannot decrypt the action id. It does not affect a single VM, and it does
  not affect anything today — `generateSummary()` is a module-scope export
  rather than an inline action closing over render values. Noted here because
  this is the first Server Action in the codebase, so it is the first time the
  constraint applies at all. Source:
  `node_modules/next/dist/docs/01-app/02-guides/server-actions.md`.

## Changing the prompt

1. Edit `SYSTEM_PROMPT` in `src/features/summary/prompt.ts`.
2. Bump `PROMPT_VERSION`. Dates, not integers — the useful question in six
   months is "was this before or after we rewrote the prompt in September", and
   `v3` does not answer it.
3. Existing summaries will show as stale with the prompt-changed reason. That is
   the intended behaviour; do not clear the cache to hide it.
