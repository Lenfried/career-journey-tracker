import { CareerGoalCard } from '@/features/goals/components/career-goal-card'
import { getStudentGoal } from '@/features/goals/queries'
import { MilestoneList } from '@/features/milestones/components/milestone-list'
import { getStudentMilestones } from '@/features/milestones/queries'
import { NoteList } from '@/features/notes/components/note-list'
import { getStudentNotes } from '@/features/notes/queries'
import { ReadinessChecklist } from '@/features/readiness/components/readiness-checklist'
import { getReadinessStatus } from '@/features/readiness/queries'
import { SkillsGapView } from '@/features/skills/components/skills-gap-view'
import { getStudentSkills } from '@/features/skills/queries'
import { AdvisorSummaryPanel } from '@/features/summary/components/advisor-summary-panel'
import { getSummaryView } from '@/features/summary/queries'
import { ProfileTabs, type ProfileTab } from './profile-tabs'
import { StudentProfileHeader } from './student-profile-header'
import type { StudentDetail } from '../types'

/**
 * MVP screens 2–5 — the student profile.
 *
 * Only the open tab's data is fetched. Each tab is an async Server Component
 * awaiting its own feature's query, so opening Overview costs a goal read and a
 * readiness read and nothing else.
 */
export async function StudentProfile({
  student,
  tab,
}: {
  student: StudentDetail
  tab: ProfileTab
}) {
  return (
    <>
      <StudentProfileHeader student={student} />

      <ProfileTabs
        studentId={student.id}
        active={tab}
        counts={{
          notes: student.noteCount,
          milestones: student.milestoneCount,
        }}
      />

      {tab === 'overview' ? <OverviewTab studentId={student.id} /> : null}
      {tab === 'notes' ? <NotesTab studentId={student.id} /> : null}
      {tab === 'milestones' ? <MilestonesTab studentId={student.id} /> : null}
      {tab === 'skills' ? <SkillsTab studentId={student.id} /> : null}
      {tab === 'summary' ? <SummaryTab studentId={student.id} /> : null}
    </>
  )
}

async function OverviewTab({ studentId }: { studentId: string }) {
  const [goal, readiness] = await Promise.all([
    getStudentGoal(studentId),
    getReadinessStatus(studentId),
  ])

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 text-lg font-semibold tracking-tight">
          Career goal
        </h2>
        <CareerGoalCard goal={goal} />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold tracking-tight">Readiness</h2>
        <ReadinessChecklist readiness={readiness} />
      </section>
    </div>
  )
}

async function NotesTab({ studentId }: { studentId: string }) {
  return <NoteList notes={await getStudentNotes(studentId)} />
}

async function MilestonesTab({ studentId }: { studentId: string }) {
  return <MilestoneList milestones={await getStudentMilestones(studentId)} />
}

async function SkillsTab({ studentId }: { studentId: string }) {
  return <SkillsGapView skills={await getStudentSkills(studentId)} />
}

async function SummaryTab({ studentId }: { studentId: string }) {
  const view = await getSummaryView(studentId)

  // `getSummaryView` returns null only for an unknown id, and the page has
  // already 404'd on that. Narrowing rather than asserting keeps it honest.
  if (!view) return null

  return <AdvisorSummaryPanel view={view} />
}
