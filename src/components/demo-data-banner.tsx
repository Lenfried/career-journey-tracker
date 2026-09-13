/**
 * Says, on every page, that nothing on screen is a real student.
 *
 * This is not decoration. A screenshot of this application taken during an
 * advisor review session and pasted into an email is indistinguishable from a
 * screenshot of real FERPA-protected records unless the page says otherwise.
 * The banner is what makes the difference visible in the screenshot.
 *
 * Remove it when — and only when — the application is reading a real data
 * source in a real environment.
 */
export function DemoDataBanner() {
  return (
    <div className="border-b border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
      <p className="mx-auto max-w-6xl px-6 py-2 text-xs text-amber-900 dark:text-amber-200">
        <span className="font-semibold tracking-wide">DEMO DATA</span>
        <span className="mx-2 opacity-40">·</span>
        Every student shown here is fictional. No real student record is in this
        application.
      </p>
    </div>
  )
}
