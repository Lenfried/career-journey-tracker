import { Input } from '@/components/ui/input'

/**
 * Roster search.
 *
 * A plain GET form, so this stays a Server Component with no client JavaScript.
 * The search term lands in the URL, which means a filtered roster is a link an
 * advisor can bookmark or paste to a colleague — and the back button works.
 */
export function StudentSearch({ value }: { value?: string }) {
  return (
    <form action="/students" className="flex gap-2">
      <Input
        type="search"
        name="q"
        defaultValue={value ?? ''}
        placeholder="Search by name or EMPLID"
        aria-label="Search students by name or EMPLID"
        className="max-w-xs"
      />
      <button
        type="submit"
        className="hover:bg-muted rounded-md border px-4 text-sm font-medium"
      >
        Search
      </button>
    </form>
  )
}
