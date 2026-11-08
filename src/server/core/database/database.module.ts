import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'

import { ConfigService } from '../config/config.service'
import { defineModule } from '../di/module'
import { TOKENS } from '../di/tokens'
import { LoggerService } from '../logger/logger.service'
import * as schema from './schema'
import { registerSqlFunctions } from './sql-functions'

export type DB = BetterSQLite3Database<typeof schema>

/**
 * Keep a single SQLite connection across Vite HMR reloads in dev
 * (module re-evaluation would otherwise open a new handle on every change).
 */
const globalForDb = globalThis as unknown as { __sqlite?: Database.Database }

function createDatabase(config: ConfigService): DB {
  const sqlite =
    globalForDb.__sqlite ?? new Database(config.get('DATABASE_URL'))
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')
  registerSqlFunctions(sqlite)
  if (!config.isProduction) globalForDb.__sqlite = sqlite
  return drizzle({ client: sqlite, schema })
}

/** Global infrastructure module: config, logger, database. */
export const CoreModule = defineModule({
  name: 'CoreModule',
  providers: [
    ConfigService,
    LoggerService,
    {
      provide: TOKENS.Database,
      useFactory: ({ get }) => createDatabase(get(ConfigService)),
    },
  ],
})
