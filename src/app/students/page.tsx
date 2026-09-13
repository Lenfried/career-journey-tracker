import { StudentRosterTable } from '@/features/students/components/student-roster-table'
import { StudentSearch } from '@/features/students/components/student-search'
import { listStudents } from '@/features/students/queries'
import { studentFiltersSchema } from '@/features/students/schemas'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams
  const { search } = studentFiltersSchema.parse({
    search: typeof params.q === 'string' ? params.q : undefined,
  })

  const students = await listStudents({ search })

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Students</h1>
          <p className="text-muted-foreground mt-1 tabular-nums">
            {students.length} {students.length === 1 ? 'student' : 'students'}
            {search ? ` matching "${search}"` : ''}
          </p>
        </div>

        <StudentSearch value={search} />
      </header>

      <StudentRosterTable students={students} search={search} />
    </main>
  )
}
