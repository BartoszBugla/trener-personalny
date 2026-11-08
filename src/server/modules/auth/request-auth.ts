import { getCookie } from '@tanstack/react-start/server'

import { resolve } from '../../app'
import { UnauthorizedException } from '../../core/errors/http-exceptions'
import { AuthService } from './auth.service'
import { SESSION_COOKIE } from '#/shared/auth/auth.dto'
import type { AuthUser } from '#/shared/auth/auth.dto'

/** User signed in on the current request (session cookie), or `null`. */
export function getRequestUser(): Promise<AuthUser | null> {
  return resolve(AuthService).verifySession(getCookie(SESSION_COOKIE))
}

/** Like `getRequestUser`, but throws 401 when nobody is signed in. */
export async function requireRequestUser(): Promise<AuthUser> {
  const user = await getRequestUser()
  if (!user) throw new UnauthorizedException({ key: 'unauthorized' })
  return user
}
