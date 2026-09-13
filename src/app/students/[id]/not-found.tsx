import Link from 'next/link'

export default function StudentNotFound() {
  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">
        Student not found
      </h1>
      <p className="text-muted-foreground mt-2">
        No student record matches that id. It may have been removed, or the link
        may be from a different environment.
      </p>
      <Link href="/students" className="mt-6 inline-block text-sm underline">
        Back to all students
      </Link>
    </main>
  )
}
