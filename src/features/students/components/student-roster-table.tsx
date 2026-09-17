import Link from 'next/link'
import { EmptyState } from '@/components/empty-state'
import type {
  SortDirection,
  StudentRosterRow,
  StudentRosterSort,
} from '../types'

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
  sort,
  direction,
}: {
  students: StudentRosterRow[]
  search?: string
  sort: StudentRosterSort
  direction: SortDirection
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
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[72rem] text-left">
        <thead className="bg-muted/50 text-muted-foreground text-sm">
          <tr>
            <SortHeader
              label="Student"
              value="name"
              search={search}
              sort={sort}
              direction={direction}
            />
            <SortHeader
              label="Entry term"
              value="entry-term"
              search={search}
              sort={sort}
              direction={direction}
            />
            <SortHeader
              label="Classification"
              value="classification"
              search={search}
              sort={sort}
              direction={direction}
            />
            <SortHeader
              label="Track"
              value="track"
              search={search}
              sort={sort}
              direction={direction}
            />
            <SortHeader
              label="Specialization"
              value="specialization"
              search={search}
              sort={sort}
              direction={direction}
            />
            <SortHeader
              label="Career term"
              value="career-term"
              search={search}
              sort={sort}
              direction={direction}
            />
            <th scope="col" className="px-6 py-3 font-medium">
              Program
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
                <span className="text-muted-foreground mt-0.5 block text-xs font-normal tabular-nums">
                  {student.emplid}
                </span>
              </td>
              <td className="text-muted-foreground px-6 py-4 tabular-nums">
                {student.entryTermLabel}
              </td>
              <td className="text-muted-foreground px-6 py-4">
                {student.classificationLabel}
              </td>
              <td className="text-muted-foreground px-6 py-4">
                {student.trackLabel ?? 'Exploring options'}
              </td>
              <td className="text-muted-foreground px-6 py-4">
                {student.specializationLabel ?? 'Not selected'}
              </td>
              <td className="text-muted-foreground px-6 py-4">
                {student.currentCareerTermLabel ?? '—'}
              </td>
              <td className="text-muted-foreground px-6 py-4">
                {student.programLabel}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SortHeader({
  label,
  value,
  search,
  sort,
  direction,
}: {
  label: string
  value: StudentRosterSort
  search?: string
  sort: StudentRosterSort
  direction: SortDirection
}) {
  const active = sort === value
  const nextDirection = active && direction === 'asc' ? 'desc' : 'asc'
  const params = new URLSearchParams({ sort: value, direction: nextDirection })
  if (search) params.set('q', search)

  return (
    <th
      scope="col"
      aria-sort={
        active ? (direction === 'asc' ? 'ascending' : 'descending') : undefined
      }
      className="px-6 py-3 font-medium whitespace-nowrap"
    >
      <Link
        href={`/students?${params.toString()}`}
        className="hover:text-foreground inline-flex items-center gap-1.5"
      >
        {label}
        {active ? (
          <span aria-hidden="true">{direction === 'asc' ? '↑' : '↓'}</span>
        ) : null}
      </Link>
    </th>
  )
}
