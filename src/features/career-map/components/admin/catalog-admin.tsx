import type { CareerAction, LookupItem } from '@/lib/canonical'
import { createCareerActionAction } from '../../actions'
import { groupActionsByCategory } from './action-groups'
import { CatalogActionForm, type EvidenceOptions } from './catalog-action-form'
import { CatalogActionItem } from './catalog-action-item'

export function CatalogAdmin({
  catalog,
  categories,
  evidenceOptions,
}: {
  catalog: CareerAction[]
  categories: LookupItem[]
  evidenceOptions: EvidenceOptions
}) {
  const groups = groupActionsByCategory(catalog, categories)

  return (
    <div className="space-y-10">
      <section aria-labelledby="catalog-actions-heading">
        <h2
          id="catalog-actions-heading"
          className="text-lg font-semibold tracking-tight"
        >
          {catalog.length} action{catalog.length === 1 ? '' : 's'} in{' '}
          {groups.length} categor{groups.length === 1 ? 'y' : 'ies'}
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Categories stay consistent across the catalog and map editors. Change
          an action’s category in its editor to move it to another group.
        </p>

        <div className="mt-4 space-y-4">
          {groups.map((group) => (
            <details key={group.id} open className="rounded-lg border">
              <summary className="bg-muted/40 hover:bg-muted/60 flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg px-4 py-3 [&::-webkit-details-marker]:hidden">
                <span className="font-semibold">{group.label}</span>
                <span className="text-muted-foreground text-sm font-normal tabular-nums">
                  {group.actions.length} action
                  {group.actions.length === 1 ? '' : 's'}
                </span>
              </summary>
              <ul className="divide-y border-t">
                {group.actions.map((action) => (
                  <li key={action.id}>
                    <CatalogActionItem
                      action={action}
                      categories={categories}
                      evidenceOptions={evidenceOptions}
                    />
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold tracking-tight">
          Add an action
        </h2>
        <div className="rounded-lg border p-4">
          <CatalogActionForm
            formAction={createCareerActionAction}
            categories={categories}
            evidenceOptions={evidenceOptions}
            submitLabel="Add action"
          />
        </div>
      </section>
    </div>
  )
}
