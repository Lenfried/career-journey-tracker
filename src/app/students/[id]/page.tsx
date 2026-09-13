import { notFound } from 'next/navigation'
import { parseProfileTab } from '@/features/students/components/profile-tabs'
import { StudentProfile } from '@/features/students/components/student-profile'
import { getStudent } from '@/features/students/queries'

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

  const student = await getStudent(id)
  if (!student) notFound()

  const tab = parseProfileTab(
    typeof query.tab === 'string' ? query.tab : undefined,
  )

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10">
      <StudentProfile student={student} tab={tab} />
    </main>
  )
}
