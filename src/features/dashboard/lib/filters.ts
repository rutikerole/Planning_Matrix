export type DashboardFilter =
  | 'all'
  | 'active'
  | 'awaiting'
  | 'designer'
  | 'paused'
  | 'archived'

export const FILTER_VALUES: readonly DashboardFilter[] = [
  'all',
  'active',
  'awaiting',
  'designer',
  'paused',
  'archived',
] as const
