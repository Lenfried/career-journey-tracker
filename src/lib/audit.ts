import 'server-only'

export async function writeAudit(event: {
  actorId: string
  action: string
  studentId: string
  recordId?: string
}): Promise<void> {
  console.info('audit', { ...event, at: new Date().toISOString() })
}
