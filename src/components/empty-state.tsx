/**
 * The "nothing here yet" state.
 *
 * Used everywhere rather than letting each list improvise, because empty is the
 * common case in advising, not the exception: a freshman two weeks in has no
 * milestones, no goal, and no skills recorded, and none of that is a problem to
 * be apologised for. Each usage says what would go here and, where it is
 * useful, what the advisor would do about it.
 */
export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="text-muted-foreground rounded-lg border border-dashed px-6 py-10 text-center">
      <p className="text-sm font-medium">{title}</p>
      {hint ? <p className="mt-1 text-sm">{hint}</p> : null}
    </div>
  )
}
