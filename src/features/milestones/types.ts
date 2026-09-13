// milestones — types

/** One career milestone, ready to render. */
export type CareerMilestoneView = {
  id: string
  typeId: string
  typeLabel: string
  title: string
  completedDate: string
  completedDateLabel: string
  description: string | null
  recordedBy: string
}
