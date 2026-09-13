import Link from 'next/link'

/**
 * Profile tab navigation.
 *
 * Links with a `?tab=` parameter rather than `components/ui/tabs`, which is a
 * Client Component. Two reasons beyond avoiding client JavaScript: the tab an
 * advisor is looking at becomes part of the URL, so "look at her notes" is a
 * link you can send; and each tab's data is fetched on the server only when
 * that tab is actually open, rather than loading all four up front.
 */

export const PROFILE_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'notes', label: 'Notes' },
  { id: 'milestones', label: 'Milestones' },
  { id: 'skills', label: 'Skills' },
] as const

export type ProfileTab = (typeof PROFILE_TABS)[number]['id']

const TAB_IDS: readonly string[] = PROFILE_TABS.map((tab) => tab.id)

/** Anything unrecognised falls back to Overview — a bad `?tab=` is not a 404. */
export function parseProfileTab(value: string | undefined): ProfileTab {
  return value && TAB_IDS.includes(value) ? (value as ProfileTab) : 'overview'
}

export function ProfileTabs({
  studentId,
  active,
  counts,
}: {
  studentId: string
  active: ProfileTab
  counts: Partial<Record<ProfileTab, number>>
}) {
  return (
    <nav aria-label="Student profile sections" className="mb-8 border-b">
      <ul className="-mb-px flex gap-1">
        {PROFILE_TABS.map((tab) => {
          const isActive = tab.id === active
          const count = counts[tab.id]

          return (
            <li key={tab.id}>
              <Link
                href={
                  tab.id === 'overview'
                    ? `/students/${studentId}`
                    : `/students/${studentId}?tab=${tab.id}`
                }
                aria-current={isActive ? 'page' : undefined}
                className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium ${
                  isActive
                    ? 'border-foreground text-foreground'
                    : 'text-muted-foreground hover:text-foreground border-transparent'
                }`}
              >
                {tab.label}
                {typeof count === 'number' ? (
                  <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs tabular-nums">
                    {count}
                  </span>
                ) : null}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
