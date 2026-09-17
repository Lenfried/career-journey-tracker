// students — schemas
//
// The canonical definition of a student lives in `lib/canonical.ts`; a record
// cannot be defined in seven feature folders and stay coherent. This file
// re-exports the slice this feature owns and adds the schemas that are purely
// this feature's business — right now, the roster filter.

import { z } from 'zod'
import { STUDENT_ROSTER_SORTS } from './types'

export {
  studentIdentitySchema,
  studentRecordSchema,
  classificationSchema,
  enrollmentStatusSchema,
} from '@/lib/canonical'

/**
 * Roster filters, parsed straight from `searchParams`.
 *
 * `catch` rather than `optional` on the whole object: a hand-mangled query
 * string should show an unfiltered roster, not an error page. There is nothing
 * a user can type in `?q=` that is worth a 500.
 */
export const studentFiltersSchema = z.object({
  search: z.string().trim().max(100).optional().catch(undefined),
  sort: z.enum(STUDENT_ROSTER_SORTS).optional().catch(undefined),
  direction: z.enum(['asc', 'desc']).optional().catch(undefined),
})

export type StudentFiltersInput = z.infer<typeof studentFiltersSchema>
