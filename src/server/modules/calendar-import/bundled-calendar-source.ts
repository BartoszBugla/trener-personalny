import { injectable } from 'inversify'

import type { CalendarSource, TrainerCalendar } from './calendar-source'

/**
 * Calendars committed to the repo under `./calendars/<trainer-email>.ics`.
 * Bundled at build time (Vite `?raw` glob), so it works in dev, tests and the
 * production server build alike. To add a trainer, drop their export there.
 *
 * The glob lives inside the method so plain Node scripts (tsx) can import
 * this module; they use `FileSystemCalendarSource` instead.
 */
@injectable()
export class BundledCalendarSource implements CalendarSource {
  fetchCalendars(): Promise<Array<TrainerCalendar>> {
    const files = import.meta.glob<string>('./calendars/*.ics', {
      query: '?raw',
      import: 'default',
      eager: true,
    })
    return Promise.resolve(
      Object.entries(files).map(([path, ics]) => ({
        calendarId: path
          .slice(path.lastIndexOf('/') + 1)
          .replace(/\.ics$/i, '')
          .toLowerCase(),
        ics,
      })),
    )
  }
}
