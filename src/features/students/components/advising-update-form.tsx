'use client'

import {
  startTransition,
  useActionState,
  useState,
  type ReactNode,
} from 'react'
import { Button } from '@/components/ui/button'
import type { AdvisingUpdateState } from '../types'

export function AdvisingUpdateForm({
  action,
  children,
  submitLabel,
}: {
  action: (
    state: AdvisingUpdateState,
    formData: FormData,
  ) => Promise<AdvisingUpdateState>
  children: ReactNode
  submitLabel: string
}) {
  const [state, submit, pending] = useActionState(action, {})
  const [edited, setEdited] = useState(false)
  return (
    <form
      action={submit}
      className="space-y-4"
      onChange={() => setEdited(true)}
      onSubmit={(event) => {
        // Keep the entered session and reason when server validation fails.
        event.preventDefault()
        const data = new FormData(event.currentTarget)
        setEdited(false)
        startTransition(() => submit(data))
      }}
    >
      <fieldset disabled={pending} className="min-w-0 space-y-4">
        {children}
        <Button type="submit" disabled={!!state.success && !edited}>
          {pending ? 'Saving…' : submitLabel}
        </Button>
      </fieldset>
      {state.error ? (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p role="status" className="text-sm">
          {state.success}
        </p>
      ) : null}
    </form>
  )
}
