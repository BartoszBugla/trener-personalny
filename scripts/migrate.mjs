/**
 * Applies pending Drizzle migrations (./drizzle) to DATABASE_URL.
 * Runs on container start, before the server. Idempotent.
 */
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'

const url = process.env.DATABASE_URL ?? 'dev.db'
const sqlite = new Database(url)
sqlite.pragma('journal_mode = WAL')
sqlite.pragma('foreign_keys = ON')

migrate(drizzle({ client: sqlite }), { migrationsFolder: './drizzle' })
sqlite.close()
console.log(`Migrations applied: ${url}`)
