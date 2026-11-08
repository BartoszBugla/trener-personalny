import { sql } from 'drizzle-orm'
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

/**
 * People known to the system – app users (staff who sign in) and clients
 * ("podopieczni", no account) alike; a client becomes an app user once given
 * access with an email.
 * Email/phone are optional (often we only know a name from a calendar entry)
 * but unique when present (SQLite allows many NULLs in a UNIQUE column).
 */
export const users = sqliteTable(
  'users',
  {
    id: integer({ mode: 'number' }).primaryKey({ autoIncrement: true }),
    name: text().notNull(),
    /** `normalizeName(name)` – used for matching calendar entries to users. */
    normalizedName: text('normalized_name').notNull(),
    email: text().unique(),
    phone: text().unique(),
    isTrainer: integer('is_trainer', { mode: 'boolean' })
      .notNull()
      .default(false),
    /**
     * May sign in to the app ("app user"). Requires `email` – the sign-in is
     * matched by it. Everyone else is a client ("podopieczny") without an
     * account.
     */
    appAccess: integer('app_access', { mode: 'boolean' })
      .notNull()
      .default(false),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [index('users_normalized_name_idx').on(t.normalizedName)],
)

/**
 * Alternative (normalized) names that resolve to a user, e.g. "ania" -> Anna Nowak.
 * Created when someone manually assigns an unmatched calendar entry, so the next
 * import matches it automatically.
 */
export const userAliases = sqliteTable('user_aliases', {
  id: integer({ mode: 'number' }).primaryKey({ autoIncrement: true }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  alias: text().notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
})

export type UserRow = typeof users.$inferSelect
export type NewUserRow = typeof users.$inferInsert
export type UserAliasRow = typeof userAliases.$inferSelect
