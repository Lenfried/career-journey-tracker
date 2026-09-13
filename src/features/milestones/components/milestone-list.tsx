import { EmptyState } from '@/components/empty-state'
import type { CareerMilestoneView } from '../types'

export function MilestoneList({
  milestones,
}: {
  milestones: CareerMilestoneView[]
}) {
  if (milestones.length === 0) {
    return (
      <EmptyState
        title="No milestones recorded."
        hint="Internships, jobs, research, leadership roles, workshops, career fairs, and networking events all belong here."
      />
    )
  }

  return (
    <ol className="divide-y overflow-hidden rounded-lg border">
      {milestones.map((milestone) => (
        <li key={milestone.id} className="px-6 py-4">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="bg-muted text-muted-foreground rounded-full px-2.5 py-0.5 text-xs font-medium">
              {milestone.typeLabel}
            </span>
            <span className="text-muted-foreground text-sm tabular-nums">
              {milestone.completedDateLabel}
            </span>
          </div>

          {/* Milestone titles are free text and some are a full sentence of
              research description. Wrapping, not truncating — a title cut off
              at the column edge is worse than a title on three lines. */}
          <p className="mt-1 font-medium">{milestone.title}</p>

          {milestone.description ? (
            <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
              {milestone.description}
            </p>
          ) : null}

          <p className="text-muted-foreground mt-2 text-xs">
            Recorded by {milestone.recordedBy}
          </p>
        </li>
      ))}
    </ol>
  )
}
