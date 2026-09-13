import { DashboardView } from '@/features/dashboard/components/dashboard-view'
import { getDashboardSummary } from '@/features/dashboard/queries'

/**
 * Rendered per request, not prerendered.
 *
 * "Overdue for follow-up" is computed against today's date. Every input to this
 * page is static — the fixture file cannot change under a running server — so
 * Next will happily prerender it at build time, and then the overdue list is
 * frozen to the date of the last deploy and quietly wrong from the next morning
 * onward. This stays true when the data source becomes a database.
 */
export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const summary = await getDashboardSummary()

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10">
      <header className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          York College · CS and AI Certificate advising
        </p>
      </header>

      <DashboardView summary={summary} />
    </main>
  )
}
