import { injectable } from 'inversify'
import { z } from 'zod'

/**
 * Server-only environment schema. Never import this from client code
 * (the whole `src/server` tree is import-protected in vite.config.ts).
 * Client-safe vars (VITE_*) live in `src/env.ts`.
 */
const serverEnvSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  DATABASE_URL: z.string().min(1).default('dev.db'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  /**
   * Directory with real trainer calendars (`<calendar-id>.ics`), kept out of
   * the repo. Unset = the sample calendars bundled with the app.
   */
  CALENDARS_DIR: z.string().min(1).optional(),

  /*
   * Firebase Admin (verifies sign-ins, issues session cookies). Service
   * account from Firebase console → Project settings → Service accounts.
   * Without the three values, GOOGLE_APPLICATION_CREDENTIALS is used.
   */
  FIREBASE_PROJECT_ID: z.string().min(1).optional(),
  FIREBASE_CLIENT_EMAIL: z.string().min(1).optional(),
  /** PEM key; `\n` escapes (as in .env files) are turned into newlines. */
  FIREBASE_PRIVATE_KEY: z
    .string()
    .min(1)
    .transform((key) => key.replace(/\\n/g, '\n'))
    .optional(),
  /**
   * Bootstrap admins: comma-separated emails and/or `@domain` entries that may
   * always sign in (to add the first app users). Everyone else needs app
   * access granted in the app (Users).
   */
  AUTH_ALLOWED_EMAILS: z
    .string()
    .default('')
    .transform((list) =>
      list
        .split(',')
        .map((entry) => entry.trim().toLowerCase())
        .filter(Boolean),
    ),
  /** Session length in days (Firebase allows 5 minutes – 14 days). */
  AUTH_SESSION_DAYS: z.coerce.number().min(1).max(14).default(5),
})

export type ServerEnv = z.infer<typeof serverEnvSchema>

/** Typed access to configuration – Nest's ConfigService equivalent. */
@injectable()
export class ConfigService {
  private readonly env: ServerEnv = serverEnvSchema.parse(process.env)

  get<TKey extends keyof ServerEnv>(key: TKey): ServerEnv[TKey] {
    return this.env[key]
  }

  get isProduction() {
    return this.env.NODE_ENV === 'production'
  }
}
