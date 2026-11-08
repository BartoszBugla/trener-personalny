import { createServerFn } from '@tanstack/react-start'

import { defaultMiddleware } from '#/lib/server-fn/middleware'
import { resolve } from '#/server/app'
import { DashboardService } from '#/server/modules/dashboard/dashboard.service'

export const getDashboard = createServerFn({ method: 'GET' })
  .middleware(defaultMiddleware)
  .handler(() => resolve(DashboardService).getSummary())
