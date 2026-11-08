import { createMiddleware } from '@tanstack/react-start'
import { notFound } from '@tanstack/react-router'

import { LOCALE_COOKIE, resolveLocale, translate } from '#/i18n/config'

/**
 * Global-ish middleware for server functions (Nest's interceptors + exception filters).
 *
 * NOTE: this file is imported by client code (server fn definitions), so it must not
 * import from `#/server/**` directly. The `.server()` body only runs on the server.
 */

/** Logs every server function call with its duration. */
export const loggingMiddleware = createMiddleware({ type: 'function' }).server(
  async ({ next, serverFnMeta }) => {
    const start = performance.now()
    try {
      return await next()
    } finally {
      const ms = (performance.now() - start).toFixed(1)
      console.log(`[serverFn] ${serverFnMeta.name} ${ms}ms`)
    }
  },
)

/**
 * Exception filter:
 * - translates service exceptions carrying an i18n key into the user's
 *   language (cookie / Accept-Language of the current request),
 * - maps `NotFoundException` (status 404) to TanStack Router's `notFound()`,
 *   so routes render their notFoundComponent.
 */
export const exceptionFilterMiddleware = createMiddleware({
  type: 'function',
}).server(async ({ next }) => {
  try {
    return await next()
  } catch (error) {
    if (isHttpError(error) && error.i18n) {
      const { getCookie, getRequestHeader } =
        await import('@tanstack/react-start/server')
      const locale = resolveLocale(
        getCookie(LOCALE_COOKIE),
        getRequestHeader('accept-language'),
      )
      error.message = translate(
        locale,
        `errors.${error.i18n.key}`,
        error.i18n.params,
      )
    }
    if (isHttpError(error) && error.status === 404) {
      throw notFound({ data: { message: error.message } })
    }
    throw error
  }
})

/**
 * Guard: only signed-in users (valid session cookie, allowed email) may call
 * the function; otherwise 401. Exposes the user as `context.user`.
 */
export const authMiddleware = createMiddleware({ type: 'function' }).server(
  async ({ next }) => {
    const { requireRequestUser } =
      await import('#/server/modules/auth/request-auth')
    const user = await requireRequestUser()
    return next({ context: { user } })
  },
)

/** For the few functions that must work signed out (session lifecycle). */
export const publicMiddleware = [loggingMiddleware, exceptionFilterMiddleware]

/** Default middleware stack for app server functions: requires sign-in. */
export const defaultMiddleware = [
  loggingMiddleware,
  exceptionFilterMiddleware,
  authMiddleware,
]

function isHttpError(error: unknown): error is Error & {
  status: number
  i18n?: { key: string; params?: Record<string, string | number> }
} {
  return (
    error instanceof Error &&
    'status' in error &&
    typeof (error as { status: unknown }).status === 'number'
  )
}
