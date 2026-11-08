import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
} from 'firebase-admin/app'
import type { App } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import type { Auth } from 'firebase-admin/auth'
import { inject, injectable } from 'inversify'

import { ConfigService } from '../../core/config/config.service'
import { ServiceUnavailableException } from '../../core/errors/http-exceptions'

const APP_NAME = 'trener-personalny'

/**
 * Lazily initialised Firebase Admin SDK. Credentials: FIREBASE_PROJECT_ID +
 * FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY, or Application Default
 * Credentials (GOOGLE_APPLICATION_CREDENTIALS / Google Cloud runtime).
 */
@injectable()
export class FirebaseAdminService {
  private app: App | undefined

  constructor(@inject(ConfigService) private readonly config: ConfigService) {}

  get isConfigured(): boolean {
    return (
      this.hasServiceAccount() ||
      Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS)
    )
  }

  get auth(): Auth {
    return getAuth(this.getApp())
  }

  /**
   * Makes sure a Firebase account exists for `email`, so an email/password
   * sign-in works after "Forgot password?" (which also verifies the address).
   * Google sign-ins don't need it. Returns whether an account was created.
   */
  async ensureUser(email: string): Promise<boolean> {
    try {
      await this.auth.getUserByEmail(email)
      return false
    } catch (error) {
      if ((error as { code?: string }).code !== 'auth/user-not-found') {
        throw error
      }
    }
    await this.auth.createUser({ email, emailVerified: false })
    return true
  }

  private getApp(): App {
    if (this.app) return this.app
    if (!this.isConfigured) {
      throw new ServiceUnavailableException({ key: 'authNotConfigured' })
    }
    // Reuse across Vite HMR reloads (initializeApp throws on duplicate names).
    const existing = getApps().find((a) => a.name === APP_NAME)
    this.app =
      existing ??
      initializeApp(
        {
          credential: this.hasServiceAccount()
            ? cert({
                projectId: this.config.get('FIREBASE_PROJECT_ID'),
                clientEmail: this.config.get('FIREBASE_CLIENT_EMAIL'),
                privateKey: this.config.get('FIREBASE_PRIVATE_KEY'),
              })
            : applicationDefault(),
          projectId: this.config.get('FIREBASE_PROJECT_ID'),
        },
        APP_NAME,
      )
    return this.app
  }

  private hasServiceAccount(): boolean {
    return Boolean(
      this.config.get('FIREBASE_PROJECT_ID') &&
      this.config.get('FIREBASE_CLIENT_EMAIL') &&
      this.config.get('FIREBASE_PRIVATE_KEY'),
    )
  }
}
