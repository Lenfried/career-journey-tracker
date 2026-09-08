import { getDashboardStats } from '@/features/analytics/queries'
import { listRecentStudents } from '@/features/students/queries'

export default async function Home() {
  const [stats, students] = await Promise.all([
    getDashboardStats(),
    listRecentStudents(5),
  ])

  return (
    <main className="mx-auto p-10 text-base">
      <header className="mb-8">
        <h1 className="text-4xl font-semibold">Career Journey Tracker</h1>
        <h2 className="text-muted-foreground mt-1 text-lg">
          York College CS and AI Certificate advising
        </h2>
      </header>

      <section className="mb-8">
        <h2 className="mb-3 text-2xl font-semibold">Overview</h2>
        <div className="grid grid-cols-3 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded border p-6">
              <p className="text-muted-foreground">{stat.label}</p>
              <p className="text-4xl font-semibold">{stat.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-2xl font-semibold">Recent students</h2>
        <ul className="flex flex-col gap-2">
          {students.map((student) => (
            <li
              key={student.id}
              className="flex items-center justify-between rounded border p-5"
            >
              <div>
                <p>
                  {student.lastName}, {student.firstName}
                </p>
                <p className="text-muted-foreground">
                  {student.emplid} · {student.major}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-semibold">{student.readiness}%</p>
                <p className="text-muted-foreground">{student.level}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
