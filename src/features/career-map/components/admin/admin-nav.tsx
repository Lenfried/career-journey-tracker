import Link from 'next/link'

const SECTIONS = [
  { id: 'catalog', label: 'Action catalog', href: '/admin/career-map/catalog' },
  { id: 'general', label: 'General map', href: '/admin/career-map/general' },
  { id: 'tracks', label: 'Tracks', href: '/admin/career-map/tracks' },
] as const

/**
 * Section nav for the career map admin screens.
 *
 * Plain links to separate routes, not a `?tab=` param — unlike the profile
 * tabs, each section here is its own page with its own save button, and a
 * shared query param would make "which section am I on" ambiguous the moment
 * a form redirects back with `?error=`.
 */
export function AdminNav({
  active,
}: {
  active: 'catalog' | 'general' | 'tracks'
}) {
  return (
    <nav aria-label="Career map admin sections" className="mb-8 border-b">
      <ul className="-mb-px flex gap-1">
        {SECTIONS.map((section) => {
          const isActive = section.id === active
          return (
            <li key={section.id}>
              <Link
                href={section.href}
                aria-current={isActive ? 'page' : undefined}
                className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium ${
                  isActive
                    ? 'border-foreground text-foreground'
                    : 'text-muted-foreground hover:text-foreground border-transparent'
                }`}
              >
                {section.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
