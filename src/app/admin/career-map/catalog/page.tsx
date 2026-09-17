import { AdminErrorBanner } from '@/features/career-map/components/admin/admin-error-banner'
import { AdminNav } from '@/features/career-map/components/admin/admin-nav'
import { CatalogAdmin } from '@/features/career-map/components/admin/catalog-admin'
import {
  getCareerMapTemplate,
  getEvidenceTypeOptions,
} from '@/features/career-map/queries'

export const dynamic = 'force-dynamic'

type SearchParams = Promise<{ error?: string }>

export default async function CareerMapCatalogAdminPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const { error } = await searchParams
  const [{ catalog, categories }, evidenceOptions] = await Promise.all([
    getCareerMapTemplate(),
    getEvidenceTypeOptions(),
  ])

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

      <AdminNav active="catalog" />
      <AdminErrorBanner message={error} />

      <CatalogAdmin
        catalog={catalog}
        categories={categories}
        evidenceOptions={evidenceOptions}
      />
    </main>
  )
}
