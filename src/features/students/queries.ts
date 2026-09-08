// students — queries

import type { StudentRow } from './types'

// Mock data
// Would need a prisma call once its set up
export async function listRecentStudents(take = 5): Promise<StudentRow[]> {
  const placeholder: StudentRow[] = [
    {
      id: '1',
      firstName: 'Ada',
      lastName: 'Placeholder',
      emplid: '10000001',
      major: 'CS',
      readiness: 82,
      level: 'on-track',
    },
    {
      id: '2',
      firstName: 'Blaise',
      lastName: 'Example',
      emplid: '10000002',
      major: 'CS',
      readiness: 58,
      level: 'needs-review',
    },
    {
      id: '3',
      firstName: 'Cleo',
      lastName: 'Sample',
      emplid: '10000003',
      major: 'CS',
      readiness: 34,
      level: 'at-risk',
    },
    {
      id: '4',
      firstName: 'Dev',
      lastName: 'Testcase',
      emplid: '10000004',
      major: 'CS',
      readiness: 91,
      level: 'on-track',
    },
    {
      id: '5',
      firstName: 'Esi',
      lastName: 'Fixture',
      emplid: '10000005',
      major: 'CS',
      readiness: 47,
      level: 'needs-review',
    },
  ]

  return placeholder.slice(0, take)
}
