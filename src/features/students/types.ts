// students — types

// Mock file to output something ot the main page
export type ReadinessLevel = 'on-track' | 'needs-review' | 'at-risk'

export type StudentRow = {
  id: string
  firstName: string
  lastName: string
  emplid: string
  major: string
  readiness: number
  level: ReadinessLevel
}
