import { z } from 'zod'
import { calendarDateSchema } from '@/lib/canonical'

export { advisingNoteSchema } from '@/lib/canonical'

export const advisingNoteFormSchema = z.object({
  sessionDate: calendarDateSchema,
  typeId: z.string().trim().min(1, 'Pick a note type'),
  content: z.string().trim().min(1, 'Enter a note').max(5000),
  followUpDate: z
    .union([calendarDateSchema, z.literal('')])
    .transform((value) => value || null),
})

export type AdvisingNoteInput = z.infer<typeof advisingNoteFormSchema>
