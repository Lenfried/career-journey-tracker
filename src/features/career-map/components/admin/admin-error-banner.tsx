/**
 * Surfaces a failed admin action.
 *
 * Server Actions here redirect back to the same page with `?error=` on
 * failure (see `fail()` in `actions.ts`) instead of using a client-side form
 * hook, so the page stays a Server Component. This is the other half of that:
 * read the message back out of the URL and show it.
 */
export function AdminErrorBanner({ message }: { message: string | undefined }) {
  if (!message) return null

  return (
    <p
      role="alert"
      className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
    >
      {message}
    </p>
  )
}
