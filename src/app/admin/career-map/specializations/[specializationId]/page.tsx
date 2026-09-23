import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AdminErrorBanner } from '@/features/career-map/components/admin/admin-error-banner'
import { AdminNav } from '@/features/career-map/components/admin/admin-nav'
import { SpecializationEditorAdmin } from '@/features/career-map/components/admin/specialization-editor-admin'
import { getCareerSpecializationTemplate } from '@/features/career-map/queries'

export const dynamic = 'force-dynamic'

type Params = Promise<{ specializationId: string }>
type SearchParams = Promise<{ error?: string }>

export default async function SpecializationEditorAdminPage({
  params,
  searchParams,
}: {
  params: Params
  searchParams: SearchParams
}) {
  const [{ specializationId }, { error }] = await Promise.all([
    params,
    searchParams,
  ])
  const template = await getCareerSpecializationTemplate(specializationId)
  if (!template) notFound()

  const { specialization, track, tracks, map, catalog, categories, students } =
    template
  const studentCount = students.filter(
    (student) => student.careerMap.specializationId === specializationId,
  ).length

  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-10">
      <header className="mb-6">
        <Link
          href="/admin/career-map/tracks"
          className="text-muted-foreground text-sm hover:underline"
        >
          ← All tracks and specializations
        </Link>
        <p className="text-muted-foreground mt-5 text-sm font-medium">
          {track.label}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          {specialization.label}
        </h1>
        <p className="text-muted-foreground mt-1">
          {specialization.description}
        </p>
      </header>

      <AdminNav active="tracks" />
      <AdminErrorBanner message={error} />

      <SpecializationEditorAdmin
        tracks={tracks}
        specialization={specialization}
        generalMap={map}
        catalog={catalog}
        categories={categories}
        studentCount={studentCount}
      />
    </main>
  )
}
