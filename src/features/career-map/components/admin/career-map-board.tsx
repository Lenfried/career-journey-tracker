import type { ReactNode } from 'react'
import type { CareerMapTerm } from '@/lib/canonical'

const YEARS: {
  label: string
  terms: { id: CareerMapTerm; label: string }[]
}[] = [
  {
    label: 'Year 1',
    terms: [
      { id: 'y1-fall', label: 'Fall' },
      { id: 'y1-spring', label: 'Spring' },
      { id: 'y1-summer', label: 'Summer' },
    ],
  },
  {
    label: 'Year 2',
    terms: [
      { id: 'y2-fall', label: 'Fall' },
      { id: 'y2-spring', label: 'Spring' },
      { id: 'y2-summer', label: 'Summer' },
    ],
  },
  {
    label: 'Year 3',
    terms: [
      { id: 'y3-fall', label: 'Fall' },
      { id: 'y3-spring', label: 'Spring' },
      { id: 'y3-summer', label: 'Summer' },
    ],
  },
  {
    label: 'Year 4',
    terms: [
      { id: 'y4-fall', label: 'Fall' },
      { id: 'y4-spring', label: 'Spring' },
    ],
  },
]

export type CareerMapBoardItem = {
  id: string
  term: CareerMapTerm
  content: ReactNode
}

/** A responsive four-year board shared by the general and overlay editors. */
export function CareerMapBoard({
  items,
  emptyMessage,
}: {
  items: CareerMapBoardItem[]
  emptyMessage: string
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {YEARS.map((year) => {
        const yearCount = year.terms.reduce(
          (count, term) =>
            count + items.filter((item) => item.term === term.id).length,
          0,
        )

        return (
          <section
            key={year.label}
            aria-labelledby={`board-${year.label.replace(' ', '-').toLowerCase()}`}
            className="bg-muted/30 min-w-0 rounded-lg border"
          >
            <header className="flex items-baseline justify-between border-b px-4 py-3">
              <h3
                id={`board-${year.label.replace(' ', '-').toLowerCase()}`}
                className="font-semibold"
              >
                {year.label}
              </h3>
              <span className="text-muted-foreground text-xs tabular-nums">
                {yearCount} {yearCount === 1 ? 'action' : 'actions'}
              </span>
            </header>

            <div className="space-y-4 p-3">
              {year.terms.map((term) => {
                const termItems = items.filter((item) => item.term === term.id)

                return (
                  <section key={term.id} aria-labelledby={`board-${term.id}`}>
                    <h4
                      id={`board-${term.id}`}
                      className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase"
                    >
                      {term.label}
                    </h4>
                    {termItems.length > 0 ? (
                      <ul className="space-y-2">
                        {termItems.map((item) => (
                          <li key={item.id}>{item.content}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-muted-foreground rounded-md border border-dashed px-3 py-4 text-center text-xs">
                        {emptyMessage}
                      </p>
                    )}
                  </section>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
