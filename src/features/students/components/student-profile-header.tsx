import Link from 'next/link'
import type { StudentDetail } from '../types'

export function StudentProfileHeader({ student }: { student: StudentDetail }) {
  return (
    <header className="mb-8">
      <Link
        href="/students"
        className="text-muted-foreground text-sm hover:underline"
      >
        ← All students
      </Link>

      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        {student.displayName}
      </h1>

      {/* The legal name is shown only as context, and only when it differs.
          Preferred name is what this student is called; the legal name is what
          CUNYFirst has on file and what an advisor needs when cross-referencing
          a registrar screen. Both matter, and which is which must be obvious. */}
      {student.preferredName ? (
        <p className="text-muted-foreground mt-1 text-sm">
          Legal name: {student.firstName} {student.lastName}
        </p>
      ) : null}

      <dl className="text-muted-foreground mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <Field label="EMPLID" value={student.emplid} numeric />
        <Field label="Program" value={student.programLabel} />
        <Field label="Classification" value={student.classificationLabel} />
        <Field label="Status" value={student.enrollmentStatusLabel} />
        <Field label="Advisor" value={student.advisor ?? 'Unassigned'} />
        <Field label="Email" value={student.email} />
      </dl>

      {student.bio ? (
        <p className="mt-4 max-w-3xl text-sm">{student.bio}</p>
      ) : null}
    </header>
  )
}

function Field({
  label,
  value,
  numeric = false,
}: {
  label: string
  value: string
  numeric?: boolean
}) {
  return (
    <div className="flex gap-2">
      <dt className="opacity-70">{label}</dt>
      <dd className={numeric ? 'tabular-nums' : undefined}>{value}</dd>
    </div>
  )
}
