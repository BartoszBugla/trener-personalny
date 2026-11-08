import type { DecodedIdToken } from 'firebase-admin/auth'
import { inject, injectable } from 'inversify'

import { ConfigService } from '../../core/config/config.service'
import {
  ForbiddenException,
  UnauthorizedException,
} from '../../core/errors/http-exceptions'
import { LoggerService } from '../../core/logger/logger.service'
import { AccessService } from './access.service'
import { FirebaseAdminService } from './firebase-admin.service'
import type { AuthUser } from '#/shared/auth/auth.dto'

/** An ID token must come from a sign-in this recent to start a session. */
const MAX_SIGN_IN_AGE_SECONDS = 5 * 60
const DAY_MS = 24 * 60 * 60 * 1000

export interface CreatedSession {
  /** Firebase session cookie value. */
  cookie: string
  maxAgeSeconds: number
  user: AuthUser
}

/**
 * Sign-in via Firebase Authentication (Google or email + password on the
 * client), sessions via Firebase session cookies verified on the server.
 *
 * Access: app users (`users.app_access`, managed in the app) plus the
 * bootstrap admins in AUTH_ALLOWED_EMAILS (needed to add the first app user).
 * Any Google account can sign in to a Firebase project, so authentication
 * alone isn't authorization. The email must also be verified: otherwise
 * someone could register an email/password account with an allowed address
 * they don't own.
 */
@injectable()
export class AuthService {
  constructor(
    @inject(FirebaseAdminService)
    private readonly firebase: FirebaseAdminService,
    @inject(ConfigService) private readonly config: ConfigService,
    @inject(AccessService) private readonly access: AccessService,
    @inject(LoggerService) private readonly logger: LoggerService,
  ) {}

  /** Exchanges a fresh ID token for a session cookie. */
  async createSession(idToken: string): Promise<CreatedSession> {
    const auth = this.firebase.auth
    let decoded: DecodedIdToken
    try {
      decoded = await auth.verifyIdToken(idToken, true)
    } catch (error) {
      this.logger.warn('Invalid ID token', { error: String(error) })
      throw new UnauthorizedException({ key: 'invalidToken' })
    }
    if (Date.now() / 1000 - decoded.auth_time > MAX_SIGN_IN_AGE_SECONDS) {
      throw new UnauthorizedException({ key: 'recentSignInRequired' })
    }
    const user = await this.authorize(decoded)

    const expiresIn = this.config.get('AUTH_SESSION_DAYS') * DAY_MS
    const cookie = await auth.createSessionCookie(idToken, { expiresIn })
    this.logger.info('Signed in', { uid: user.uid, email: user.email })
    return { cookie, maxAgeSeconds: expiresIn / 1000, user }
  }

  /**
   * User of a session cookie, or `null` if missing, expired, access revoked,
   * or auth isn't configured. Revoking app access (or removing an email from
   * AUTH_ALLOWED_EMAILS) ends its sessions on the next request.
   */
  async verifySession(cookie: string | undefined): Promise<AuthUser | null> {
    if (!cookie || !this.firebase.isConfigured) return null
    try {
      const decoded = await this.firebase.auth.verifySessionCookie(cookie)
      return await this.authorize(decoded)
    } catch {
      return null
    }
  }

  private async authorize(token: DecodedIdToken): Promise<AuthUser> {
    const email = token.email?.toLowerCase()
    if (!email) throw new ForbiddenException({ key: 'emailRequired' })
    if (!token.email_verified) {
      throw new ForbiddenException({ key: 'emailNotVerified' })
    }
    if (!(await this.isAllowed(email))) {
      this.logger.warn('Sign-in rejected: email not allowed', { email })
      throw new ForbiddenException({ key: 'accessDenied', params: { email } })
    }
    return {
      uid: token.uid,
      email,
      name: typeof token.name === 'string' ? token.name : null,
      picture: token.picture ?? null,
    }
  }

  /** App user, or exact email / `@domain` entry in AUTH_ALLOWED_EMAILS. */
  private async isAllowed(email: string): Promise<boolean> {
    const domain = email.slice(email.lastIndexOf('@'))
    const bootstrap = this.config
      .get('AUTH_ALLOWED_EMAILS')
      .some((entry) => entry === email || entry === domain)
    return bootstrap || this.access.hasAccess(email)
  }
}
