import { AdminErrorBanner } from '@/features/career-map/components/admin/admin-error-banner'
import { AdminNav } from '@/features/career-map/components/admin/admin-nav'
import { GeneralMapAdmin } from '@/features/career-map/components/admin/general-map-board-admin'
import { getCareerMapTemplate } from '@/features/career-map/queries'

export const dynamic = 'force-dynamic'

type SearchParams = Promise<{ error?: string }>

export default async function GeneralMapAdminPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const { error } = await searchParams
  const { map, catalog, categories } = await getCareerMapTemplate()

  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-10">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">
          Career map admin
        </h1>
        <p className="text-muted-foreground mt-1">
          Arrange the shared foundation every student receives. Specialization
          overlays are edited separately.
        </p>
      </header>

      <AdminNav active="general" />
      <AdminErrorBanner message={error} />

      <GeneralMapAdmin map={map} catalog={catalog} categories={categories} />
    </main>
  )
}
