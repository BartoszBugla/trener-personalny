import type Database from 'better-sqlite3'
import { sql } from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'
import type { SQLiteColumn } from 'drizzle-orm/sqlite-core'

import { BUSINESS_TIME_ZONE } from '../time/local-date'
import { normalizeName } from '#/shared/users/normalize-name'

const timeOfDay = new Intl.DateTimeFormat('en-GB', {
  timeZone: BUSINESS_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

/**
 * App-defined SQL functions (SQLite has no time zones and only ASCII case
 * folding):
 * - `normalize_name(text)` – same as `normalizeName` ("Łukasz" -> "lukasz"),
 *   for diacritic-insensitive search and Polish-friendly sorting.
 * - `sort_key(text)` – `normalize_name` without leading punctuation
 *   ("- BIZNES -" sorts under B); `NULL` for empty values.
 * - `local_time(unix_seconds)` – "HH:MM" in the business time zone (DST-aware).
 */
export function registerSqlFunctions(sqlite: Database.Database): void {
  sqlite.function('normalize_name', { deterministic: true }, (value) =>
    typeof value === 'string' ? normalizeName(value) : null,
  )
  sqlite.function('sort_key', { deterministic: true }, (value) => {
    if (typeof value !== 'string') return null
    return normalizeName(value).replace(/^[^a-z0-9]+/, '') || null
  })
  sqlite.function('local_time', { deterministic: true }, (seconds) =>
    typeof seconds === 'number' ? timeOfDay.format(seconds * 1000) : null,
  )
}

export const normalizedSql = (column: SQLiteColumn): SQL =>
  sql`normalize_name(${column})`

export const sortKeySql = (value: SQLiteColumn | SQL): SQL =>
  sql`sort_key(${value})`

export const localTimeSql = (column: SQLiteColumn): SQL =>
  sql`local_time(${column})`

/**
 * `value LIKE %fragment%` with `%` / `_` typed by the user taken literally.
 * SQLite LIKE folds ASCII case only – pass normalized values for names.
 */
export function containsSql(value: SQLiteColumn | SQL, fragment: string): SQL {
  const escaped = fragment.replace(/[\\%_]/g, (c) => `\\${c}`)
  return sql`${value} LIKE ${`%${escaped}%`} ESCAPE '\\'`
}
