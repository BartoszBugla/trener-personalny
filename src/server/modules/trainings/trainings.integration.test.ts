import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { beforeAll, describe, expect, it } from 'vitest'
import type { Container } from 'inversify'

import { AppModule } from '../../app.module'
import type { DB } from '../../core/database/database.module'
import { createContainer } from '../../core/di/container'
import { TOKENS } from '../../core/di/tokens'
import { CalendarImportService } from '../calendar-import/calendar-import.service'
import type {
  CalendarSource,
  TrainerCalendar,
} from '../calendar-import/calendar-source'
import { TrainingsService } from './trainings.service'

class FakeCalendarSource implements CalendarSource {
  calendars: Array<TrainerCalendar> = []
  fetchCalendars() {
    return Promise.resolve(this.calendars)
  }
}

const vevent = (uid: string, start: string, summary: string) =>
  `BEGIN:VEVENT
UID:${uid}
DTSTART:${start}
DTEND:${start.replace(/T(\d{2})/, (_, h: string) => `T${String(Number(h) + 1).padStart(2, '0')}`)}
SUMMARY:${summary}
STATUS:CONFIRMED
END:VEVENT`

const calendar = (name: string, ...events: Array<string>) =>
  `BEGIN:VCALENDAR
VERSION:2.0
X-WR-CALNAME:${name}
${events.join('\n')}
END:VCALENDAR`

/* Warsaw is UTC+1 in November: 23:30Z on Nov 2 is Nov 3 locally. */
const KACPER = calendar(
  'Kacper Kopeć - Praca',
  vevent('k1', '20261102T080000Z', 'Łukasz Nowak'),
  vevent('k2', '20261102T233000Z', 'Łukasz Nowak'),
  vevent('k3', '20261104T080000Z', 'Robert'),
  vevent('k4', '20261105T080000Z', 'Dodge Do Serwisu'),
  vevent('k5', '20261106T080000Z', 'Dodge Do Serwisu'),
  vevent('k6', '20261107T080000Z', 'Odwołany - Robert'),
)
const OLA = calendar(
  'Ola',
  vevent('o1', '20261103T080000Z', 'Anna Wiśniewska'),
  vevent('o2', '20261110T080000Z', 'Anna Wiśniewska'),
)

describe('TrainingsService list / ignore (integration)', () => {
  const now = new Date('2026-11-01T12:00:00Z')
  let container: Container
  let source: FakeCalendarSource
  let importer: CalendarImportService
  let service: TrainingsService

  const titles = async (query: Parameters<TrainingsService['list']>[0]) =>
    (await service.list(query)).items.map((t) => t.title)

  beforeAll(async () => {
    process.env.DATABASE_URL = ':memory:'
    process.env.NODE_ENV = 'production'
    process.env.LOG_LEVEL = 'error'
    container = createContainer(AppModule)
    source = new FakeCalendarSource()
    container.unbind(TOKENS.CalendarSource)
    container.bind(TOKENS.CalendarSource).toConstantValue(source)
    migrate(container.get<DB>(TOKENS.Database), { migrationsFolder: 'drizzle' })
    importer = container.get(CalendarImportService)
    service = container.get(TrainingsService)

    source.calendars = [
      { calendarId: 'abc@group.calendar.google.com', ics: KACPER },
      { calendarId: 'ola@example.com', ics: OLA },
    ]
    await importer.importAll({ now })
  })

  it('paginates newest first by default', async () => {
    const first = await service.list({ pageSize: 25 })
    expect(first).toMatchObject({ total: 8, page: 1, pageCount: 1 })
    expect(first.items[0].title).toBe('Anna Wiśniewska') // Nov 10
    expect(first.items.at(-1)?.title).toBe('Łukasz Nowak') // Nov 2

    const asc = await service.list({ pageSize: 25, sort: 'asc' })
    expect(asc.items[0].startsAt).toBe('2026-11-02T08:00:00.000Z')
  })

  it('sorts by any column', async () => {
    // Time of day in Warsaw: 23:30Z is 00:30 local – earliest, not latest.
    const byTime = await service.list({ sortBy: 'time', sort: 'asc' })
    expect(byTime.items[0].startsAt).toBe('2026-11-02T23:30:00.000Z')

    // Normalized: "Łukasz" sorts with L (before R), not after Z.
    const clients = (
      await service.list({ sortBy: 'client', sort: 'asc' })
    ).items.map((t) => t.client?.name ?? t.clientName)
    expect(clients).toEqual([
      'Anna Wiśniewska',
      'Anna Wiśniewska',
      'Dodge Do Serwisu',
      'Dodge Do Serwisu',
      'Łukasz Nowak',
      'Łukasz Nowak',
      'Robert',
      'Robert',
    ])

    const trainers = (
      await service.list({ sortBy: 'trainer', sort: 'desc' })
    ).items.map((t) => t.trainer.name)
    expect(trainers.slice(0, 2)).toEqual(['Ola', 'Ola'])

    expect(
      (await service.list({ sortBy: 'status', sort: 'asc' })).items[0].status,
    ).toBe('cancelled')
  })

  it('clamps a page past the end to the last page', async () => {
    // pageSize must be one of TRAINING_PAGE_SIZES; 8 rows fit one page.
    const page = await service.list({ page: 99 })
    expect(page).toMatchObject({ page: 1, pageCount: 1 })
    expect(page.items).toHaveLength(8)
  })

  it('searches client names ignoring case and Polish letters', async () => {
    expect(await titles({ q: 'lukasz' })).toEqual([
      'Łukasz Nowak',
      'Łukasz Nowak',
    ])
    expect(await titles({ q: 'serwisu' })).toEqual([
      'Dodge Do Serwisu',
      'Dodge Do Serwisu',
    ])
    expect(await titles({ q: '100%' })).toEqual([])
  })

  it('filters by trainer, status, unassigned and local date range', async () => {
    const { items } = await service.list({})
    const ola = items.find((t) => t.trainer.name === 'Ola')!.trainer.id
    expect(await titles({ trainerId: ola })).toHaveLength(2)

    expect(await titles({ status: 'cancelled' })).toEqual(['Odwołany - Robert'])

    expect(await titles({ unassigned: true, sort: 'asc' })).toEqual([
      'Robert',
      'Dodge Do Serwisu',
      'Dodge Do Serwisu',
      'Odwołany - Robert',
    ])

    // Nov 3 local day: the 23:30Z training of Nov 2 and Ola's 08:00Z one.
    expect(await titles({ from: '2026-11-03', to: '2026-11-03' })).toEqual([
      'Anna Wiśniewska',
      'Łukasz Nowak',
    ])
  })

  it('lists a time range for the calendar, oldest first', async () => {
    const range = (from: string, to: string, trainerId?: number) =>
      service
        .listRange({ from, to, trainerId })
        .then((items) => items.map((t) => t.title))

    // Nov 3 local day (UTC+1): includes the 23:30Z training of Nov 2.
    expect(
      await range('2026-11-03T00:00:00+01:00', '2026-11-04T00:00:00+01:00'),
    ).toEqual(['Łukasz Nowak', 'Anna Wiśniewska'])

    const { items } = await service.list({})
    const ola = items.find((t) => t.trainer.name === 'Ola')!.trainer.id
    expect(
      await range('2026-11-01T00:00:00Z', '2026-12-01T00:00:00Z', ola),
    ).toEqual(['Anna Wiśniewska', 'Anna Wiśniewska'])

    await expect(
      service.listRange({
        from: '2026-01-01T00:00:00Z',
        to: '2026-12-01T00:00:00Z',
      }),
    ).rejects.toThrow(/Range must be 1–\d+ days/)
  })

  it('ignores an event with its title, keeps it ignored on re-import, restores', async () => {
    const before = await service.list({ q: 'dodge' })
    expect(before.unassignedTotal).toBe(4)

    const { updated } = await service.ignore({
      trainingId: before.items[0].id,
      applyToSameTitle: true,
    })
    expect(updated).toBe(2)
    expect(await titles({ q: 'dodge' })).toEqual([]) // hidden by default
    expect(await titles({ status: 'ignored' })).toHaveLength(2)
    expect((await service.list({})).unassignedTotal).toBe(2)

    const summary = await importer.importAll({ now })
    expect(summary.ignored).toBe(2)
    expect(await titles({ status: 'ignored' })).toHaveLength(2)

    const restored = await service.restore({ trainingId: before.items[0].id })
    expect(restored.updated).toBe(2)
    expect(await titles({ status: 'ignored' })).toEqual([])
    expect((await importer.importAll({ now })).ignored).toBe(0)
  })

  it('ignores a single event without remembering its title', async () => {
    const [robert] = (await service.list({ q: 'robert', status: 'confirmed' }))
      .items
    expect(
      (await service.ignore({ trainingId: robert.id, applyToSameTitle: false }))
        .updated,
    ).toBe(1)
    await importer.importAll({ now })
    expect(await titles({ status: 'ignored' })).toEqual(['Robert'])
  })
})
