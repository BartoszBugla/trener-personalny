import { z } from 'zod'

/**
 * httpOnly cookie holding the Firebase session cookie. `__session` is the only
 * name Firebase Hosting / Cloud Run forward, so it works behind them too.
 */
export const SESSION_COOKIE = '__session'

export const signInSchema = z.object({
  /** Fresh Firebase ID token from the client SDK. */
  idToken: z.string().min(1).max(10_000),
})
export type SignInDto = z.input<typeof signInSchema>

/** Signed-in user (serializable, safe to send to the client). */
export interface AuthUser {
  uid: string
  email: string
  name: string | null
  picture: string | null
}

/**
 * `?redirect=` target after signing in: only same-site paths, never another
 * origin ("//evil.com", "https://…").
 */
export function safeRedirectPath(value: unknown): string {
  return typeof value === 'string' &&
    value.startsWith('/') &&
    !value.startsWith('//') &&
    !value.startsWith('/\\') &&
    !value.startsWith('/login')
    ? value
    : '/'
}
