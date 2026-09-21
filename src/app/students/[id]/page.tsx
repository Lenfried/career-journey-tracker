import { notFound } from 'next/navigation'
import { parseProfileTab } from '@/features/students/components/profile-tabs'
import { StudentProfile } from '@/features/students/components/student-profile'
import { getStudent } from '@/features/students/queries'
import { requireActor } from '@/lib/authz'
import { writeAudit } from '@/lib/audit'

type Params = Promise<{ id: string }>
type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default async function StudentProfilePage({
  params,
  searchParams,
}: {
  params: Params
  searchParams: SearchParams
}) {
  const [{ id }, query] = await Promise.all([params, searchParams])

  const actor = await requireActor(['advisor', 'faculty', 'admin'])

  const student = await getStudent(id)
  if (!student) notFound()
  await writeAudit({
    actorId: actor.id,
    action: 'student.detail.read',
    studentId: id,
  })

  const tab = parseProfileTab(
    typeof query.tab === 'string' ? query.tab : undefined,
  )

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10">
      {typeof query.error === 'string' ? (
        <div
          role="alert"
          className="mb-6 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
        >
          {query.error}
        </div>
      ) : null}
      <StudentProfile student={student} tab={tab} />
    </main>
  )
}
