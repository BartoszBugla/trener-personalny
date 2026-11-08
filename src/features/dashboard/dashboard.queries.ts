import { queryOptions } from '@tanstack/react-query'

import { getDashboard } from './dashboard.functions'

export const dashboardKeys = {
  all: ['dashboard'] as const,
}

export const dashboardQueryOptions = () =>
  queryOptions({
    queryKey: dashboardKeys.all,
    queryFn: () => getDashboard(),
  })
