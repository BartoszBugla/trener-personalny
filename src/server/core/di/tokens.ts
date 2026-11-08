/**
 * Injection tokens for non-class providers (like Nest's string/symbol tokens
 * used with `@Inject(TOKEN)`). Classes are their own tokens.
 */
export const TOKENS = {
  /** Drizzle database instance (see core/database). */
  Database: Symbol.for('Database'),
  /** `CalendarSource` implementation (see modules/calendar-import). */
  CalendarSource: Symbol.for('CalendarSource'),
} as const
