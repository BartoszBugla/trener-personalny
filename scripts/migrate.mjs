/**
 * Applies pending Drizzle migrations (./drizzle) to DATABASE_URL.
 * Runs on container start, before the server. Idempotent.
 *
 * When an existing database has pending migrations, it is first backed up to
 * <db dir>/backups/app-<timestamp>.db (the newest KEEP_BACKUPS are kept).
 */
import { mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import path from 'node:path'

import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'

const MIGRATIONS_DIR = './drizzle'
const KEEP_BACKUPS = 10

const url = process.env.DATABASE_URL ?? 'dev.db'
const sqlite = new Database(url)
sqlite.pragma('journal_mode = WAL')
sqlite.pragma('foreign_keys = ON')

/** Newest migration in the repo vs. newest one applied to this database. */
function hasPendingMigrations() {
  const journal = JSON.parse(
    readFileSync(path.join(MIGRATIONS_DIR, 'meta/_journal.json'), 'utf8'),
  )
  const latest = Math.max(...journal.entries.map((entry) => entry.when))
  const tracked = sqlite
    .prepare(
      "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = '__drizzle_migrations'",
    )
    .get()
  if (!tracked) return false // brand-new database: nothing to back up
  const { applied } = sqlite
    .prepare('SELECT max(created_at) AS applied FROM __drizzle_migrations')
    .get()
  return applied !== null && Number(applied) < latest
}

async function backup() {
  const dir = path.join(path.dirname(path.resolve(url)), 'backups')
  mkdirSync(dir, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const file = path.join(dir, `app-${stamp}.db`)
  await sqlite.backup(file)
  // Self-contained single file (no -wal/-shm when it's opened later).
  const copy = new Database(file)
  copy.pragma('journal_mode = DELETE')
  copy.close()
  console.info(`Backup before migrating: ${file}`)

  const old = readdirSync(dir)
    .filter((name) => /^app-.*\.db$/.test(name))
    .toSorted()
    .slice(0, -KEEP_BACKUPS)
  for (const name of old) {
    for (const suffix of ['', '-wal', '-shm']) {
      rmSync(path.join(dir, name + suffix), { force: true })
    }
  }
}

if (hasPendingMigrations()) await backup()

migrate(drizzle({ client: sqlite }), { migrationsFolder: MIGRATIONS_DIR })
sqlite.close()
console.info(`Migrations applied: ${url}`)
