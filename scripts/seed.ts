/**
 * Seeds the database using the same DI container as the app: imports trainer
 * calendars (trainers, clients, trainings) from `CALENDARS_DIR`, or the sample
 * calendars bundled with the app when it's unset.
 * Idempotent – safe to run again.
 * Run: pnpm db:seed
 */
import path from 'node:path'

import { config } from 'dotenv'

import { getContainer } from '../src/server/app'
import { ConfigService } from '../src/server/core/config/config.service'
import { TOKENS } from '../src/server/core/di/tokens'
import { CalendarImportService } from '../src/server/modules/calendar-import/calendar-import.service'
import {
  BUNDLED_CALENDARS_DIR,
  FileSystemCalendarSource,
} from '../src/server/modules/calendar-import/file-system-calendar-source'

config({ path: ['.env.local', '.env'] })

async function main() {
  const container = getContainer()
  // `import.meta.glob` (BundledCalendarSource) only works under Vite.
  const dir =
    container.get(ConfigService).get('CALENDARS_DIR') ?? BUNDLED_CALENDARS_DIR
  container.unbind(TOKENS.CalendarSource)
  container
    .bind(TOKENS.CalendarSource)
    .toConstantValue(new FileSystemCalendarSource(path.resolve(dir)))

  const summary = await container.get(CalendarImportService).importAll()
  console.log('Seed complete:', summary)
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
