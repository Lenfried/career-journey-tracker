import { notFound } from 'next/navigation'
import Link from 'next/link'
import { AdminErrorBanner } from '@/features/career-map/components/admin/admin-error-banner'
import { TrackEditorAdmin } from '@/features/career-map/components/admin/track-editor-admin'
import {
  getCareerMapTemplate,
  getCareerTrackTemplate,
} from '@/features/career-map/queries'

export const dynamic = 'force-dynamic'

type Params = Promise<{ trackId: string }>
type SearchParams = Promise<{ error?: string }>

export default async function TrackEditorAdminPage({
  params,
  searchParams,
}: {
  params: Params
  searchParams: SearchParams
}) {
  const [{ trackId }, { error }] = await Promise.all([params, searchParams])
  const template = await getCareerTrackTemplate(trackId)
  if (!template) notFound()

  const { track, catalog, categories, students } = template
  const categoryLabel = new Map(categories.map((c) => [c.id, c.label]))
  const studentCount = students.filter(
    (student) => student.careerMap.trackId === trackId,
  ).length

  // The overlay editor shows each action's general-map term for comparison,
  // so this page needs the general map too, not only the track.
  const { map: generalMap } = await getCareerMapTemplate()

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-10">
      <header className="mb-6">
        <Link
          href="/admin/career-map/tracks"
          className="text-muted-foreground text-sm hover:underline"
        >
          ← All tracks
        </Link>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          {track.label}
        </h1>
        <p className="text-muted-foreground mt-1">{track.description}</p>
      </header>

      <AdminErrorBanner message={error} />

      <TrackEditorAdmin
        track={track}
        generalMap={generalMap}
        catalog={catalog}
        categoryLabel={categoryLabel}
        studentCount={studentCount}
      />
    </main>
  )
}
