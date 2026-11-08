import { createFileRoute } from '@tanstack/react-router'

import { resolve } from '#/server/app'
import { SystemService } from '#/server/modules/system/system.service'

/**
 * Server route (REST endpoint) – GET /api/health.
 * Use server routes for public HTTP APIs (webhooks, mobile, 3rd parties);
 * use server functions for app-internal RPC.
 */
export const Route = createFileRoute('/api/health')({
  server: {
    handlers: {
      GET: async () => {
        const info = await resolve(SystemService).getInfo()
        return Response.json(info, {
          status: info.status === 'ok' ? 200 : 503,
        })
      },
    },
  },
})
