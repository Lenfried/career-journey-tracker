import { AdminErrorBanner } from '@/features/career-map/components/admin/admin-error-banner'
import { AdminNav } from '@/features/career-map/components/admin/admin-nav'
import { GeneralMapAdmin } from '@/features/career-map/components/admin/general-map-admin'
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
  const categoryLabel = new Map(categories.map((c) => [c.id, c.label]))

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-10">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">
          Career map admin
        </h1>
        <p className="text-muted-foreground mt-1">
          Edit the shared action catalog, the general map, and tracks. Every
          student reads from this.
        </p>
      </header>

      <AdminNav active="general" />
      <AdminErrorBanner message={error} />

      <GeneralMapAdmin
        map={map}
        catalog={catalog}
        categoryLabel={categoryLabel}
      />
    </main>
  )
}
