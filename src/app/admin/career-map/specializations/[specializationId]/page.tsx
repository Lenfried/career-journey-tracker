import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AdminErrorBanner } from '@/features/career-map/components/admin/admin-error-banner'
import { SpecializationEditorAdmin } from '@/features/career-map/components/admin/track-editor-admin'
import {
  getCareerMapTemplate,
  getCareerSpecializationTemplate,
} from '@/features/career-map/queries'

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
  const [template, mapTemplate] = await Promise.all([
    getCareerSpecializationTemplate(specializationId),
    getCareerMapTemplate(),
  ])
  if (!template) notFound()

  const { specialization, track, catalog, categories, students } = template
  const categoryLabel = new Map(
    categories.map((category) => [category.id, category.label]),
  )
  const studentCount = students.filter(
    (student) => student.careerMap.specializationId === specializationId,
  ).length

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-10">
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

      <AdminErrorBanner message={error} />

      <SpecializationEditorAdmin
        tracks={mapTemplate.tracks}
        specialization={specialization}
        generalMap={mapTemplate.map}
        catalog={catalog}
        categoryLabel={categoryLabel}
        studentCount={studentCount}
      />
    </main>
  )
}
