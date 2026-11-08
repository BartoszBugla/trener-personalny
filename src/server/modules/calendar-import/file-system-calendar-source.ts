import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'

import type { CalendarSource, TrainerCalendar } from './calendar-source'

/**
 * Reads `<calendar-id>.ics` files from a directory at runtime. Used when
 * `CALENDARS_DIR` is set (real calendars, kept out of the repo) and by Node
 * scripts (e.g. `pnpm db:seed`), where Vite's `import.meta.glob` used by
 * `BundledCalendarSource` isn't available.
 */
export class FileSystemCalendarSource implements CalendarSource {
  constructor(private readonly directory: string) {}

  async fetchCalendars(): Promise<Array<TrainerCalendar>> {
    const files = (await readdir(this.directory)).filter((f) =>
      f.toLowerCase().endsWith('.ics'),
    )
    return Promise.all(
      files.map(async (file) => ({
        calendarId: file.replace(/\.ics$/i, '').toLowerCase(),
        ics: await readFile(path.join(this.directory, file), 'utf8'),
      })),
    )
  }
}

/** Calendars bundled with the app (same files as `BundledCalendarSource`). */
export const BUNDLED_CALENDARS_DIR = path.resolve(
  'src/server/modules/calendar-import/calendars',
)
