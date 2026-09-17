/**
 * Shared styling for the admin forms.
 *
 * Plain native `<input>`/`<select>`/`<textarea>`/`<button>`, not the shadcn
 * equivalents — `components/ui/select.tsx` is a Client Component, and every
 * other screen in this feature renders with zero client JavaScript. These
 * forms genuinely need interactivity (they submit), but that interactivity is
 * the browser's own form handling, not React state, so there is still nothing
 * here that needs `'use client'`.
 */

export const FIELD_CLASS =
  'w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

export const PRIMARY_BUTTON_CLASS =
  'rounded-lg bg-foreground px-4 py-1.5 text-sm font-medium text-background hover:opacity-90'

export const SECONDARY_BUTTON_CLASS =
  'rounded-lg border px-4 py-1.5 text-sm font-medium hover:bg-muted'

export const DANGER_LINK_CLASS =
  'text-sm text-red-700 hover:underline dark:text-red-400'

export function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="text-muted-foreground font-medium">{label}</span>
      {children}
    </label>
  )
}
