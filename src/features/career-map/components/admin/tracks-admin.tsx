import Link from 'next/link'
import type {
  CareerSpecialization,
  CareerTrack,
  StudentRecord,
} from '@/lib/canonical'
import {
  createCareerSpecializationAction,
  deleteCareerSpecializationAction,
} from '../../actions'
import { FIELD_CLASS, PRIMARY_BUTTON_CLASS } from './form-field'

export function TracksAdmin({
  tracks,
  specializations,
  students,
}: {
  tracks: CareerTrack[]
  specializations: CareerSpecialization[]
  students: StudentRecord[]
}) {
  const countBySpecialization = new Map<string, number>()
  for (const student of students) {
    const specializationId = student.careerMap.specializationId
    if (specializationId) {
      countBySpecialization.set(
        specializationId,
        (countBySpecialization.get(specializationId) ?? 0) + 1,
      )
    }
  }

  return (
    <div className="space-y-10">
      <section>
        <h2 className="text-lg font-semibold tracking-tight">
          {tracks.length} track{tracks.length === 1 ? '' : 's'}
        </h2>
        <p className="text-muted-foreground mb-4 text-sm">
          Tracks are broad career families. Specializations hold the action
          overlay and required skills students actually follow.
        </p>

        <div className="space-y-4">
          {tracks.map((track) => {
            const children = specializations.filter(
              (specialization) => specialization.trackId === track.id,
            )
            return (
              <section
                key={track.id}
                className="overflow-hidden rounded-lg border"
              >
                <header className="bg-muted/40 border-b px-4 py-3">
                  <h3 className="font-semibold">{track.label}</h3>
                  <p className="text-muted-foreground text-sm">
                    {track.description}
                  </p>
                </header>
                {children.length > 0 ? (
                  <ul className="divide-y">
                    {children.map((specialization) => {
                      const count =
                        countBySpecialization.get(specialization.id) ?? 0
                      return (
                        <li
                          key={specialization.id}
                          className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3"
                        >
                          <div className="min-w-0 flex-1">
                            <Link
                              href={`/admin/career-map/specializations/${specialization.id}`}
                              className="font-medium hover:underline"
                            >
                              {specialization.label}
                            </Link>
                            <p className="text-muted-foreground truncate text-sm">
                              {specialization.description}
                            </p>
                          </div>
                          <span className="text-muted-foreground text-sm tabular-nums">
                            {count} student{count === 1 ? '' : 's'}
                          </span>
                          <Link
                            href={`/admin/career-map/specializations/${specialization.id}`}
                            className="text-sm hover:underline"
                          >
                            Edit
                          </Link>
                          <form
                            action={deleteCareerSpecializationAction.bind(
                              null,
                              specialization.id,
                            )}
                          >
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
                ) : (
                  <p className="text-muted-foreground px-4 py-3 text-sm">
                    No specializations in this track yet.
                  </p>
                )}
              </section>
            )
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold tracking-tight">
          Add a specialization
        </h2>
        <form
          action={createCareerSpecializationAction}
          className="space-y-4 rounded-lg border p-4"
        >
          <label className="block space-y-1 text-sm">
            <span className="text-muted-foreground font-medium">Track</span>
            <select name="trackId" required className={FIELD_CLASS}>
              {tracks.map((track) => (
                <option key={track.id} value={track.id}>
                  {track.label}
                </option>
              ))}
            </select>
          </label>
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
            Add specialization
          </button>
        </form>
      </section>
    </div>
  )
}
