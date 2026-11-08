import { createServerFn } from '@tanstack/react-start'
import { deleteCookie, setCookie } from '@tanstack/react-start/server'

import { publicMiddleware } from '#/lib/server-fn/middleware'
import { resolve } from '#/server/app'
import { ConfigService } from '#/server/core/config/config.service'
import { AuthService } from '#/server/modules/auth/auth.service'
import { getRequestUser } from '#/server/modules/auth/request-auth'
import { SESSION_COOKIE, signInSchema } from '#/shared/auth/auth.dto'

/*
 * Public on purpose (no auth middleware): these establish or end a session.
 */

/** Current user, or `null` when signed out / session expired. */
export const getSessionUser = createServerFn({ method: 'GET' })
  .middleware(publicMiddleware)
  .handler(() => getRequestUser())

/**
 * Exchanges a fresh Firebase ID token (after Google / email+password sign-in
 * on the client) for an httpOnly session cookie.
 */
export const signIn = createServerFn({ method: 'POST' })
  .middleware(publicMiddleware)
  .validator(signInSchema)
  .handler(async ({ data }) => {
    const session = await resolve(AuthService).createSession(data.idToken)
    setCookie(SESSION_COOKIE, session.cookie, {
      httpOnly: true,
      secure: resolve(ConfigService).isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: session.maxAgeSeconds,
    })
    return session.user
  })

export const signOut = createServerFn({ method: 'POST' })
  .middleware(publicMiddleware)
  .handler(() => {
    deleteCookie(SESSION_COOKIE, { path: '/' })
    return null
  })
