'use client'

/**
 * The Generate / Regenerate button.
 *
 * The only client component in this feature, and the only reason it is one:
 * generation takes ten to thirty seconds and the advisor needs to see that
 * something is happening. Everything else on the tab is server-rendered.
 *
 * `useTransition` rather than `useActionState` because there is no form and no
 * form state — one argument, one call, and a pending flag.
 */

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { generateSummary } from '../actions'

export function GenerateSummaryButton({
  studentId,
  label,
  variant = 'default',
}: {
  studentId: string
  label: string
  variant?: 'default' | 'outline'
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function onClick() {
    setError(null)

    startTransition(async () => {
      const result = await generateSummary(studentId)
      if (!result.ok) setError(result.error)
    })
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <Button
        type="button"
        onClick={onClick}
        disabled={pending}
        variant={variant}
        aria-busy={pending}
      >
        {pending ? 'Generating…' : label}
      </Button>

      {/* A spinner alone reads as a hung page at this duration. Saying how long
          it usually takes is what stops an advisor pressing it twice. */}
      {pending ? (
        <p
          role="status"
          className="text-muted-foreground flex items-center gap-2 text-sm"
        >
          <span
            aria-hidden
            className="border-muted-foreground/30 border-t-foreground inline-block size-3.5 animate-spin rounded-full border-2"
          />
          Reading the record and writing a summary. This usually takes 10–30
          seconds.
        </p>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
        >
          {error}
        </p>
      ) : null}
    </div>
  )
}
