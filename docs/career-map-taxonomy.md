# Career Map Taxonomy

This document defines the career map's two-level taxonomy and the contract that
UI, fixture, service-layer, and future AI code share. The machine-readable
source of truth remains [`src/lib/canonical.ts`](../src/lib/canonical.ts).

## Why there are two levels

A single label was previously doing two jobs. It described both a broad career
family (useful for advising, reporting, and exploration) and a narrow path
(useful for recommending concrete actions and skills). Those concepts now have
separate names and stable identifiers:

```text
Track (broad family)
└── Specialization (focused path)
    ├── career-map placement overrides
    ├── excluded general actions
    └── required skills
```

Examples:

| Track                  | Specialization        |
| ---------------------- | --------------------- |
| Software engineering   | Backend engineering   |
| Data & AI              | AI/ML research        |
| Quantitative computing | Quantitative research |

The broad families are intentionally stable. Specializations can evolve as the
department learns which paths students actually pursue. This split follows the
same broad-to-specific pattern found in the
[O*NET computer occupation family](https://www.onetonline.org/find/family?f=15),
[ACM CS2023 knowledge areas](https://csed.acm.org/knowledge-areas/), and
[NCES CIP classifications](https://nces.ed.gov/ipeds/cipcode/browse.aspx?y=56),
while keeping familiar industry terms at the specialization level.

## Canonical records

`careerTracks` contains only broad metadata:

```ts
type CareerTrack = {
  id: string
  label: string
  description: string
}
```

`careerSpecializations` contains the focused configuration:

```ts
type CareerSpecialization = {
  id: string
  trackId: string
  label: string
  description: string
  placements: CareerActionPlacement[]
  excludes: string[]
  requiredSkills: RequiredSkill[]
}
```

Each student stores both selections independently:

```ts
type StudentCareerMap = {
  trackId: string | null
  trackSetAt: string | null
  specializationId: string | null
  specializationSetAt: string | null
  progress: CareerActionProgress[]
}
```

The dataset validator enforces these invariants:

- every specialization points to an existing track;
- a student's track and specialization point to existing records;
- a selected specialization belongs to the selected track;
- each id and its `SetAt` timestamp are either both set or both `null`;
- a student may have a track without a specialization, but never the reverse.

## Resolution behavior

The department publishes one general map. A student's selected specialization
then overlays it:

1. General placements establish the default action and term.
2. Specialization `placements` add a new action or move a general action.
3. Specialization `excludes` remove a general action from that path.
4. Student progress may move an action again; the advisor's per-student choice
   wins over both templates.

Broad tracks do not modify the map. They are grouping and reporting concepts.
Required skills follow the same ownership rule: specialization requirements are
merged with advisor-added student requirements, while the student's held skills
remain unchanged when their path changes.

The admin UI mirrors these layers. `/admin/career-map/general` is the only place
that displays and edits the department-wide four-year board. A specialization
editor displays only that path's added or moved cards, exclusions, and required
skills; it does not repeat the general map. Each overlay card can be returned to
the inherited default independently.

Action categories are the shared browsing taxonomy across those layers. The
catalog and unplaced-action list display actions in configured category order,
and specialization action selectors use the same category groups. An action's
stable `act_*` id is generated when the action is created; editing its title or
category changes where it is displayed without changing that id.

Progress is keyed by `actionId`, not by track or specialization. Shared actions
retain their completion state after a path change. Progress for an action that
the new specialization no longer includes remains visible as previous-path
work instead of being deleted.

## Schema version 2 migration

Fixture schema version 2 is intentionally breaking; the project is still in its
fixture-driven experimental phase.

| Version 1 meaning                                      | Version 2 replacement                                      |
| ------------------------------------------------------ | ---------------------------------------------------------- |
| `careerTracks[]` held overlays and skills              | overlays and skills moved to `careerSpecializations[]`     |
| `student.careerMap.trackId` selected a narrow path     | `trackId` selects a broad family                           |
| no explicit specialization field                       | `specializationId` and `specializationSetAt` added         |
| `CareerMapView.track*` represented the only path label | view now exposes separate `track*` and `specialization*`   |
| skill source was `"track"`                             | skill source is `"specialization"`                         |
| admin edited `/tracks/[trackId]` overlays              | admin edits `/specializations/[specializationId]` overlays |

The three existing path records were preserved as specializations, so their
placement overrides and required skills did not change. Student assignments
were mapped to their new broad parent and retained the original selection time
as `specializationSetAt`.

## Contract for AI integration

AI code should start from the label-resolved `CareerMapView` returned by
`src/features/career-map/queries.ts`, not import fixtures or rejoin the canonical
dataset itself. It must then build a narrower, explicitly reviewed AI input DTO.
Relevant source fields are:

- `trackId`, `trackLabel`, and `trackDescription` for the broad family;
- `specializationId`, `specializationLabel`, and
  `specializationDescription` for the focused path;
- `terms`, `focusActions`, `overdueActions`, and `carriedActions` for plan state;
- `previousSpecializationWork` for preserved work outside the current path.

`CareerMapView` contains no student name, email, or EMPLID, but it is **not
PII-free**: action progress includes free-text notes and advisor names, and free
text can contain identifying or sensitive context. Do not send the whole view
to a model unchanged. Select the minimum fields the prompt needs, omit
`markedBy` and `note` by default, and document any exception. Project rules also
require explicit user-triggered generation, the York LiteLLM proxy, and cached
output with model and prompt-version metadata when AI summaries are implemented.

Do not infer a specialization from free-text goals in read paths. If a future AI
feature recommends a specialization, represent that as a separate suggestion
until a user explicitly accepts it; only accepted structured ids belong in the
canonical student record.

## Extending the taxonomy

Add a broad track only when the department needs a durable reporting or
navigation family. Add a specialization when students need distinct actions or
skills. A proposed leaf such as frontend, mobile, DevOps/platform, cybersecurity,
data engineering, or cloud infrastructure should therefore normally be a
specialization under an existing broad track, not a new top-level track.

When adding either level:

1. update the fixture arrays and keep ids stable once introduced;
2. add or update scenario coverage in `src/lib/fixtures.test.ts`;
3. confirm every specialization's `trackId` exists;
4. update this document if the ownership or resolution rules change;
5. run `npm run typecheck` and `npm run test`.
