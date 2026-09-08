import { getDashboardStats } from '@/features/analytics/queries'
import { listRecentStudents } from '@/features/students/queries'
import type { ReadinessLevel } from '@/features/students/types'

const LEVEL_LABEL: Record<ReadinessLevel, string> = {
  'on-track': 'On track',
  'needs-review': 'Needs review',
  'at-risk': 'At risk',
}

const LEVEL_BADGE: Record<ReadinessLevel, string> = {
  'on-track':
    'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  'needs-review':
    'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  'at-risk': 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
}

export default async function Home() {
  const [stats, students] = await Promise.all([
    getDashboardStats(),
    listRecentStudents(5),
  ])

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10">
      <header className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          York College · CS and AI Certificate advising
        </p>
      </header>

      {/* ---------- stats ---------- */}
      <section className="mb-12 grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-card rounded-lg border p-6">
            <p className="text-muted-foreground text-sm">{stat.label}</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight">
              {stat.value}
            </p>
          </div>
        ))}
      </section>

      {/* ---------- recent students ---------- */}
      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-xl font-semibold tracking-tight">
            Recent students
          </h2>
          <a
            href="/students"
            className="text-muted-foreground text-sm hover:underline"
          >
            View all
          </a>
        </div>

        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-left">
            <thead className="bg-muted/50 text-muted-foreground text-sm">
              <tr>
                <th className="px-6 py-3 font-medium">Student</th>
                <th className="px-6 py-3 font-medium">EMPLID</th>
                <th className="px-6 py-3 font-medium">Major</th>
                <th className="px-6 py-3 font-medium">Readiness</th>
                <th className="px-6 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.id} className="border-t">
                  <td className="px-6 py-4 font-medium">
                    {student.lastName}, {student.firstName}
                  </td>
                  <td className="text-muted-foreground px-6 py-4 tabular-nums">
                    {student.emplid}
                  </td>
                  <td className="text-muted-foreground px-6 py-4">
                    {student.major}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-muted h-2 w-24 overflow-hidden rounded-full">
                        <div
                          className="bg-foreground h-full rounded-full"
                          style={{ width: `${student.readiness}%` }}
                        />
                      </div>
                      <span className="tabular-nums">{student.readiness}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${LEVEL_BADGE[student.level]}`}
                    >
                      {LEVEL_LABEL[student.level]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}
