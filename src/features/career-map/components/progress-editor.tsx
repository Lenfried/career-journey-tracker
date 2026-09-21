'use client'

import { useState } from 'react'
import {
  CAREER_ACTION_STATUSES,
  type CareerActionStatus,
  type LookupItem,
} from '@/lib/canonical'
import { CAREER_ACTION_STATUS_LABELS } from '@/lib/labels'
import {
  SessionNoteFields,
  ADVISOR_FIELD_CLASS,
} from '@/features/notes/components/session-note-fields'
import { AdvisingUpdateForm } from '@/features/students/components/advising-update-form'
import { recordActionProgress } from '../progress-actions'
import type { CareerActionView } from '../types'

export type ActionEditorContext = {
  studentId: string
  noteTypes: LookupItem[]
  today: string
}

export function ProgressEditor({
  action,
  context,
}: {
  action: CareerActionView
  context: ActionEditorContext
}) {
  const [status, setStatus] = useState<CareerActionStatus>(action.status)
  return (
    <AdvisingUpdateForm
      action={recordActionProgress.bind(
        null,
        context.studentId,
        action.actionId,
      )}
      submitLabel="Save progress and note"
    >
      <label className="block space-y-1 text-sm">
        <span>Progress status</span>
        <select
          name="status"
          value={status}
          onChange={(event) =>
            setStatus(event.target.value as CareerActionStatus)
          }
          className={ADVISOR_FIELD_CLASS}
        >
          {CAREER_ACTION_STATUSES.map((value) => (
            <option key={value} value={value}>
              {CAREER_ACTION_STATUS_LABELS[value]}
            </option>
          ))}
        </select>
      </label>
      {status === 'in-progress' && action.targetCount > 1 ? (
        <label className="block space-y-1 text-sm">
          <span>Completed count (target: {action.targetCount})</span>
          <input
            name="completedCount"
            type="number"
            min={0}
            max={action.targetCount - 1}
            required
            defaultValue={Math.min(
              action.completedCount,
              action.targetCount - 1,
            )}
            className={ADVISOR_FIELD_CLASS}
          />
        </label>
      ) : (
        <input
          type="hidden"
          name="completedCount"
          value={status === 'done' ? action.targetCount : 0}
        />
      )}
      <p className="text-muted-foreground text-xs">
        Done records the full target count. Not started and Not applicable
        record zero. The action’s scheduled term stays the same.
      </p>
      <SessionNoteFields noteTypes={context.noteTypes} today={context.today} />
    </AdvisingUpdateForm>
  )
}
