import Link from 'next/link'
import { EmptyState } from '@/components/empty-state'
import type { StudentSummary } from '../types'

/**
 * MVP screen 1 — the roster.
 *
 * Hand-rolled rather than `components/ui/table`, which is a Client Component:
 * using it would pull the whole roster across the client boundary to render
 * static rows. Plain markup keeps this server-rendered.
 */
export function StudentRosterTable({
  students,
  search,
}: {
  students: StudentSummary[]
  search?: string
}) {
  if (students.length === 0) {
    return (
      <EmptyState
        title={
          search
            ? `No student matches "${search}".`
            : 'No students in the roster.'
        }
        hint={search ? 'Search matches name or EMPLID.' : undefined}
      />
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full text-left">
        <thead className="bg-muted/50 text-muted-foreground text-sm">
          <tr>
            <th scope="col" className="px-6 py-3 font-medium">
              Student
            </th>
            <th scope="col" className="px-6 py-3 font-medium">
              EMPLID
            </th>
            <th scope="col" className="px-6 py-3 font-medium">
              Program
            </th>
            <th scope="col" className="px-6 py-3 font-medium">
              Classification
            </th>
          </tr>
        </thead>
        <tbody>
          {students.map((student) => (
            <tr key={student.id} className="hover:bg-muted/40 border-t">
              <td className="px-6 py-4 font-medium">
                <Link
                  href={`/students/${student.id}`}
                  className="hover:underline"
                >
                  {student.sortableName}
                </Link>
                {student.enrollmentStatus !== 'enrolled' ? (
                  <span className="text-muted-foreground ml-2 text-xs font-normal">
                    {student.enrollmentStatusLabel}
                  </span>
                ) : null}
              </td>
              <td className="text-muted-foreground px-6 py-4 tabular-nums">
                {student.emplid}
              </td>
              <td className="text-muted-foreground px-6 py-4">
                {student.programLabel}
              </td>
              <td className="text-muted-foreground px-6 py-4">
                {student.classificationLabel}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
