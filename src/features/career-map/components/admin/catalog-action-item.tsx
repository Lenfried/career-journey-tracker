import type { CareerAction, LookupItem } from '@/lib/canonical'
import {
  deleteCareerActionAction,
  updateCareerActionAction,
} from '../../actions'
import { CatalogActionForm, type EvidenceOptions } from './catalog-action-form'

export function CatalogActionItem({
  action,
  categories,
  evidenceOptions,
}: {
  action: CareerAction
  categories: LookupItem[]
  evidenceOptions: EvidenceOptions
}) {
  return (
    <details className="group">
      <summary className="hover:bg-muted/40 flex cursor-pointer list-none items-baseline gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 flex-1 font-medium">{action.title}</span>
        <span className="text-muted-foreground text-xs" aria-hidden="true">
          <span className="group-open:hidden">Edit</span>
          <span className="hidden group-open:inline">Close</span>
        </span>
      </summary>

      <div className="space-y-4 border-t px-4 py-4">
        <p className="text-muted-foreground text-xs">
          Internal ID: <code>{action.id}</code>. This stable ID is generated
          when the action is created and is not changed when its title or
          category is edited.
        </p>
        <CatalogActionForm
          formAction={updateCareerActionAction.bind(null, action.id)}
          defaults={action}
          categories={categories}
          evidenceOptions={evidenceOptions}
          submitLabel="Save changes"
        />

        <form
          action={deleteCareerActionAction.bind(null, action.id)}
          className="border-t pt-4"
        >
          <button
            type="submit"
            className="text-sm text-red-700 hover:underline dark:text-red-400"
          >
            Delete this action
          </button>
          <p className="text-muted-foreground mt-1 text-xs">
            Blocked if it is placed on the general map, referenced by a
            specialization, or a student has progress recorded against it.
          </p>
        </form>
      </div>
    </details>
  )
}
