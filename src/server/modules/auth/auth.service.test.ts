import type { DecodedIdToken } from 'firebase-admin/auth'
import { describe, expect, it, vi } from 'vitest'

import type { ConfigService } from '../../core/config/config.service'
import type { LoggerService } from '../../core/logger/logger.service'
import type { AccessService } from './access.service'
import { AuthService } from './auth.service'
import type { FirebaseAdminService } from './firebase-admin.service'

const nowSeconds = () => Math.floor(Date.now() / 1000)

const token = (overrides: Partial<DecodedIdToken> = {}): DecodedIdToken =>
  ({
    uid: 'uid-1',
    email: 'Kacper@Example.com',
    email_verified: true,
    name: 'Kacper Kopeć',
    picture: 'https://example.com/a.png',
    auth_time: nowSeconds(),
    ...overrides,
  }) as DecodedIdToken

function setup(options: {
  decoded?: DecodedIdToken
  allowed?: ReadonlyArray<string>
  configured?: boolean
  /** Emails of app users in the database. */
  appUsers?: ReadonlyArray<string>
}) {
  const auth = {
    verifyIdToken: vi.fn(() => Promise.resolve(options.decoded ?? token())),
    verifySessionCookie: vi.fn(() =>
      Promise.resolve(options.decoded ?? token()),
    ),
    createSessionCookie: vi.fn(() => Promise.resolve('session-cookie')),
  }
  const firebase = {
    isConfigured: options.configured ?? true,
    auth,
  } as unknown as FirebaseAdminService
  const values = {
    AUTH_ALLOWED_EMAILS: options.allowed ?? ['kacper@example.com'],
    AUTH_SESSION_DAYS: 5,
  }
  const config = {
    get: (key: keyof typeof values) => values[key],
  } as unknown as ConfigService
  const logger = {
    info: vi.fn(),
    warn: vi.fn(),
  } as unknown as LoggerService
  const access = {
    hasAccess: (email: string) =>
      Promise.resolve((options.appUsers ?? []).includes(email)),
  } as unknown as AccessService
  return { service: new AuthService(firebase, config, access, logger), auth }
}

describe('AuthService', () => {
  it('creates a session for an allowed, verified email', async () => {
    const { service, auth } = setup({})
    const session = await service.createSession('id-token')
    expect(session).toEqual({
      cookie: 'session-cookie',
      maxAgeSeconds: 5 * 24 * 60 * 60,
      user: {
        uid: 'uid-1',
        email: 'kacper@example.com',
        name: 'Kacper Kopeć',
        picture: 'https://example.com/a.png',
      },
    })
    expect(auth.verifyIdToken).toHaveBeenCalledWith('id-token', true)
    expect(auth.createSessionCookie).toHaveBeenCalledWith('id-token', {
      expiresIn: 5 * 24 * 60 * 60 * 1000,
    })
  })

  it('allows app users from the database', async () => {
    const { service } = setup({ allowed: [], appUsers: ['kacper@example.com'] })
    await expect(service.createSession('t')).resolves.toBeDefined()
  })

  it('allows whole domains with an "@domain" entry', async () => {
    const { service } = setup({ allowed: ['@example.com'] })
    await expect(service.createSession('t')).resolves.toBeDefined()
  })

  it.each([
    [
      'email not on the list',
      { decoded: token({ email: 'x@other.com' }) },
      403,
    ],
    ['nobody allowed', { allowed: [] }, 403],
    ['unverified email', { decoded: token({ email_verified: false }) }, 403],
    [
      'stale sign-in',
      { decoded: token({ auth_time: nowSeconds() - 10 * 60 }) },
      401,
    ],
  ] as const)('rejects %s', async (_, options, status) => {
    const { service, auth } = setup(options)
    await expect(service.createSession('t')).rejects.toMatchObject({ status })
    expect(auth.createSessionCookie).not.toHaveBeenCalled()
  })

  it('rejects an invalid ID token with 401', async () => {
    const { service, auth } = setup({})
    auth.verifyIdToken.mockRejectedValueOnce(new Error('bad signature'))
    await expect(service.createSession('t')).rejects.toMatchObject({
      status: 401,
    })
  })

  describe('verifySession', () => {
    it('returns the user of a valid cookie', async () => {
      const { service } = setup({})
      await expect(service.verifySession('c')).resolves.toMatchObject({
        email: 'kacper@example.com',
      })
    })

    it('returns null without a cookie or when auth is not configured', async () => {
      await expect(setup({}).service.verifySession(undefined)).resolves.toBe(
        null,
      )
      await expect(
        setup({ configured: false }).service.verifySession('c'),
      ).resolves.toBe(null)
    })

    it('returns null for expired cookies and removed emails', async () => {
      const expired = setup({})
      expired.auth.verifySessionCookie.mockRejectedValueOnce(
        new Error('expired'),
      )
      await expect(expired.service.verifySession('c')).resolves.toBe(null)

      const removed = setup({ allowed: ['someone@else.com'] })
      await expect(removed.service.verifySession('c')).resolves.toBe(null)
    })
  })
})
