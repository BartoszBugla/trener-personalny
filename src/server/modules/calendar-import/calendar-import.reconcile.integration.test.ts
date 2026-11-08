import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { Container } from 'inversify'

import { AppModule } from '../../app.module'
import type { DB } from '../../core/database/database.module'
import { createContainer } from '../../core/di/container'
import { TOKENS } from '../../core/di/tokens'
import { trainings } from '../trainings/trainings.table'
import { TrainingsService } from '../trainings/trainings.service'
import { CalendarImportService } from './calendar-import.service'
import type { CalendarSource, TrainerCalendar } from './calendar-source'

/** Calendar whose content the test changes between imports. */
class FakeCalendarSource implements CalendarSource {
  calendars: Array<TrainerCalendar> = []
  fetchCalendars() {
    return Promise.resolve(this.calendars)
  }
}

const vevent = (uid: string, start: string, summary: string, extra = '') =>
  `BEGIN:VEVENT
UID:${uid}
DTSTART:${start}
DTEND:${start.replace(/T(\d{2})/, (_, h: string) => `T${String(Number(h) + 1).padStart(2, '0')}`)}
SUMMARY:${summary}
STATUS:CONFIRMED
${extra}END:VEVENT`

const calendar = (...events: Array<string>) =>
  `BEGIN:VCALENDAR
VERSION:2.0
X-WR-CALNAME:Kamil
${events.join('\n')}
END:VCALENDAR`

/** Weekly on Monday, 4 occurrences in UTC – start hour configurable. */
const series = (hour: string) =>
  vevent(
    'series-1',
    `20261102T${hour}0000Z`,
    'Anna Nowak',
    'RRULE:FREQ=WEEKLY;COUNT=4\n',
  )
const single = vevent('single-1', '20261104T080000Z', 'Marek Lewandowski')

describe('CalendarImportService reconciliation (integration)', () => {
  const now = new Date('2026-11-01T12:00:00Z') // horizon: 2026-12-01
  let container: Container
  let source: FakeCalendarSource
  let importer: CalendarImportService
  let service: TrainingsService
  let db: DB

  const setCalendar = (ics: string, coveredFrom?: Date) => {
    source.calendars = [{ calendarId: 'kamil@example.com', ics, coveredFrom }]
  }
  const list = () => service.findAll()
  const active = async () =>
    (await list()).filter((t) => t.status !== 'removed')

  beforeAll(() => {
    process.env.DATABASE_URL = ':memory:'
    process.env.NODE_ENV = 'production'
    process.env.LOG_LEVEL = 'error'
    container = createContainer(AppModule)
    source = new FakeCalendarSource()
    container.unbind(TOKENS.CalendarSource)
    container.bind(TOKENS.CalendarSource).toConstantValue(source)
    db = container.get<DB>(TOKENS.Database)
    migrate(db, { migrationsFolder: 'drizzle' })
    importer = container.get(CalendarImportService)
    service = container.get(TrainingsService)
  })

  beforeEach(async () => {
    await db.delete(trainings)
  })

  afterAll(() => container.unbindAll())

  it('marks a deleted event as removed and restores it when it comes back', async () => {
    setCalendar(calendar(single, series('17')))
    await importer.importAll({ now })
    expect(await active()).toHaveLength(5)

    setCalendar(calendar(series('17')))
    const summary = await importer.importAll({ now })
    expect(summary.removed).toBe(1)
    const removed = (await list()).find((t) => t.title === 'Marek Lewandowski')
    expect(removed?.status).toBe('removed')
    expect(await active()).toHaveLength(4)

    setCalendar(calendar(single, series('17')))
    const back = await importer.importAll({ now })
    expect(back).toMatchObject({ created: 0, removed: 0 })
    expect((await list()).find((t) => t.id === removed?.id)?.status).toBe(
      'confirmed',
    )
  })

  it('does not duplicate trainings when a whole series changes time', async () => {
    setCalendar(calendar(series('17')))
    await importer.importAll({ now })

    setCalendar(calendar(series('18')))
    const summary = await importer.importAll({ now })
    expect(summary).toMatchObject({ created: 4, removed: 4 })

    const hours = (await active()).map((t) =>
      new Date(t.startsAt).getUTCHours(),
    )
    expect(hours).toEqual([18, 18, 18, 18])
    // Running it again changes nothing.
    expect(await importer.importAll({ now })).toMatchObject({
      created: 0,
      removed: 0,
      updated: 4,
    })
  })

  it('marks a training turned into a non-training event as removed', async () => {
    setCalendar(calendar(single))
    await importer.importAll({ now })

    setCalendar(calendar(vevent('single-1', '20261104T080000Z', 'Urlop')))
    expect((await importer.importAll({ now })).removed).toBe(1)
  })

  it('only reconciles the period covered by a windowed source', async () => {
    setCalendar(calendar(single, series('17')))
    await importer.importAll({ now })

    // Source now only returns events from Nov 10 on; earlier ones are not
    // "deleted", they're just outside the window.
    setCalendar(calendar(series('17')), new Date('2026-11-10T00:00:00Z'))
    const summary = await importer.importAll({ now })
    expect(summary.removed).toBe(0)
    expect(await active()).toHaveLength(5)
  })

  it('leaves other trainers untouched', async () => {
    source.calendars = [
      { calendarId: 'kamil@example.com', ics: calendar(single) },
      { calendarId: 'ola@example.com', ics: calendar(series('17')) },
    ]
    await importer.importAll({ now })

    source.calendars = [
      { calendarId: 'kamil@example.com', ics: calendar() },
      { calendarId: 'ola@example.com', ics: calendar(series('17')) },
    ]
    expect((await importer.importAll({ now })).removed).toBe(1)
    expect((await active()).every((t) => t.title === 'Anna Nowak')).toBe(true)
  })

  it('imports a shared calendar for the trainer named in it', async () => {
    const shared = calendar(
      vevent('s-1', '20261103T080000Z', 'Zenon kowalczyk'),
      vevent('s-2', '20261104T080000Z', 'Zenon Kowalczyk nowy'),
      vevent('s-3', '20261105T080000Z', 'Mama Patrycji'),
      vevent('s-4', '20261106T080000Z', 'Fryderyk + Filip'),
      vevent('s-5', '20261106T100000Z', 'Opłata za Prąd + Mieszkanie'),
      vevent('s-6', '20261107T100000Z', 'Koszenie Trawy'),
    ).replace('X-WR-CALNAME:Kamil', 'X-WR-CALNAME:Kacper Kopeć - Praca ')
    source.calendars = [
      { calendarId: 'abc123@group.calendar.google.com', ics: shared },
    ]
    const summary = await importer.importAll({ now })
    expect(summary).toMatchObject({
      trainersCreated: 1,
      created: 5,
      skipped: 1,
      clientsCreated: 1,
      unassigned: 3,
    })

    const rows = await list()
    expect(new Set(rows.map((t) => t.trainer.name))).toEqual(
      new Set(['Kacper Kopeć']),
    )
    // Case and the "nowy" (new client) marker don't split the client.
    const zenon = rows.filter((t) => t.title.startsWith('Zenon'))
    expect(zenon).toHaveLength(2)
    expect(new Set(zenon.map((t) => t.client?.id)).size).toBe(1)
    expect(rows.filter((t) => t.client === null).map((t) => t.title)).toEqual([
      'Mama Patrycji',
      'Fryderyk + Filip',
      'Koszenie Trawy', // one-off title: no client created
    ])

    // Re-import finds the same trainer by name.
    expect((await importer.importAll({ now })).trainersCreated).toBe(0)
  })

  it('imports uploaded calendars without touching the configured source', async () => {
    setCalendar(calendar())
    const uploaded = [
      { calendarId: 'kamil@example.com', ics: calendar(single, series('17')) },
    ]
    expect(await importer.importCalendars(uploaded, { now })).toMatchObject({
      calendars: 1,
      created: 5,
    })
    // Re-uploading the same file updates instead of duplicating.
    expect(await importer.importCalendars(uploaded, { now })).toMatchObject({
      created: 0,
      updated: 5,
      removed: 0,
    })
    expect(await active()).toHaveLength(5)
  })
})
