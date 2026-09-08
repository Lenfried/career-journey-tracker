// analytics — queries

import type { Stat } from './types'

export async function getDashboardStats(): Promise<Stat[]> {
  const placeholderStatList: Stat[] = [
    { label: 'Active students', value: '248' },
    { label: 'Average readiness', value: '64%' },
    { label: 'Needing review', value: '31' },
  ]

  return placeholderStatList
}
