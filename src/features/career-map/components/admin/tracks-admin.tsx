import Link from 'next/link'
import type { CareerTrack, StudentRecord } from '@/lib/canonical'
import { createCareerTrackAction, deleteCareerTrackAction } from '../../actions'
import { FIELD_CLASS, PRIMARY_BUTTON_CLASS } from './form-field'

export function TracksAdmin({
  tracks,
  students,
}: {
  tracks: CareerTrack[]
  students: StudentRecord[]
}) {
  const countByTrack = new Map<string, number>()
  for (const student of students) {
    const trackId = student.careerMap.trackId
    if (trackId) countByTrack.set(trackId, (countByTrack.get(trackId) ?? 0) + 1)
  }

  return (
    <div className="space-y-10">
      <section>
        <h2 className="mb-3 text-lg font-semibold tracking-tight">
          {tracks.length} track{tracks.length === 1 ? '' : 's'}
        </h2>

        <ul className="divide-y overflow-hidden rounded-lg border">
          {tracks.map((track) => {
            const count = countByTrack.get(track.id) ?? 0
            return (
              <li
                key={track.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/admin/career-map/tracks/${track.id}`}
                    className="font-medium hover:underline"
                  >
                    {track.label}
                  </Link>
                  <p className="text-muted-foreground truncate text-sm">
                    {track.description}
                  </p>
                </div>

                <span className="text-muted-foreground text-sm tabular-nums">
                  {count} student{count === 1 ? '' : 's'}
                </span>

                <Link
                  href={`/admin/career-map/tracks/${track.id}`}
                  className="text-sm hover:underline"
                >
                  Edit
                </Link>

                <form action={deleteCareerTrackAction.bind(null, track.id)}>
                  <button
                    type="submit"
                    className="text-sm text-red-700 hover:underline dark:text-red-400"
                  >
                    Delete
                  </button>
                </form>
              </li>
            )
          })}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold tracking-tight">
          Add a track
        </h2>
        <form
          action={createCareerTrackAction}
          className="space-y-4 rounded-lg border p-4"
        >
          <label className="block space-y-1 text-sm">
            <span className="text-muted-foreground font-medium">Label</span>
            <input name="label" required className={FIELD_CLASS} />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-muted-foreground font-medium">
              Description
            </span>
            <textarea
              name="description"
              required
              rows={2}
              className={FIELD_CLASS}
            />
          </label>
          <button type="submit" className={PRIMARY_BUTTON_CLASS}>
            Add track
          </button>
        </form>
      </section>
    </div>
  )
}
