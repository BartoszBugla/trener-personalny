import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Container } from 'inversify'

import { AppModule } from '../../app.module'
import type { DB } from '../../core/database/database.module'
import { createContainer } from '../../core/di/container'
import { TOKENS } from '../../core/di/tokens'
import { TrainingsService } from '../trainings/trainings.service'
import { UsersService } from '../users/users.service'
import { CalendarImportService } from './calendar-import.service'
import type { Training } from '#/shared/trainings/trainings.dto'

/** Imports the real bundled calendars into an in-memory DB. */
describe('CalendarImportService (integration)', () => {
  const now = new Date('2026-11-08T12:00:00Z')
  let container: Container
  let importer: CalendarImportService
  let trainingsService: TrainingsService
  let usersService: UsersService
  let all: Array<Training>

  const byClientName = (name: string) =>
    all.filter((t) => t.clientName === name)

  beforeAll(async () => {
    process.env.DATABASE_URL = ':memory:'
    process.env.NODE_ENV = 'production'
    process.env.LOG_LEVEL = 'error'
    container = createContainer(AppModule)
    migrate(container.get<DB>(TOKENS.Database), { migrationsFolder: 'drizzle' })
    importer = container.get(CalendarImportService)
    trainingsService = container.get(TrainingsService)
    usersService = container.get(UsersService)

    await importer.importAll({ now })
    all = await trainingsService.findAll()
  })

  afterAll(() => container.unbindAll())

  it('creates trainers from calendar owners', async () => {
    const trainers = (await usersService.findAll()).filter((u) => u.isTrainer)
    expect(trainers.map((t) => ({ name: t.name, email: t.email }))).toEqual(
      expect.arrayContaining([
        { name: 'Bartek', email: 'bartek.fit@gmail.com' },
        { name: 'Kamil', email: 'kamil.trener@gmail.com' },
        { name: 'Ola', email: 'ola.trenerka@gmail.com' },
      ]),
    )
    expect(trainers).toHaveLength(3)
  })

  it('skips non-trainings and respects the one-month horizon', () => {
    expect(all.some((t) => t.title === 'Urlop')).toBe(false)
    expect(all.some((t) => t.title === 'Spotkanie zespołu')).toBe(false)
    const horizon = new Date('2026-12-08T12:00:00Z').getTime()
    expect(all.every((t) => new Date(t.startsAt).getTime() <= horizon)).toBe(
      true,
    )
  })

  it('matches full names and shares clients across trainers', () => {
    const anna = byClientName('Anna Nowak')
    const trainers = new Set(anna.map((t) => t.trainer.name))
    expect(trainers).toEqual(new Set(['Kamil', 'Ola']))
    expect(new Set(anna.map((t) => t.client?.id)).size).toBe(1)
  })

  it('cleans titles before matching', () => {
    const tomasz = all.filter((t) => t.title.includes('Tomasz Wójcik'))
    expect(tomasz.length).toBeGreaterThan(0)
    expect(new Set(tomasz.map((t) => t.client?.name))).toEqual(
      new Set(['Tomasz Wójcik']),
    )
    expect(byClientName('Zofia Mazur').every((t) => t.client)).toBe(true)
  })

  it('imports cancelled trainings with status "cancelled"', () => {
    const cancelled = all.filter((t) => t.status === 'cancelled')
    expect(cancelled.map((t) => t.title).sort()).toEqual([
      'Anna Nowak', // standalone STATUS:CANCELLED
      'Anna Nowak', // RECURRENCE-ID override of the series
      'ODWOŁANY – Tomasz Wójcik',
    ])
  })

  it('leaves single-word names unassigned', () => {
    const unassigned = all.filter((t) => !t.client)
    expect(new Set(unassigned.map((t) => t.clientName))).toEqual(
      new Set(['Ewa', 'Ania']),
    )
  })

  it('is idempotent on re-import', async () => {
    const summary = await importer.importAll({ now })
    expect(summary.created).toBe(0)
    expect(summary.clientsCreated).toBe(0)
    expect(summary.trainersCreated).toBe(0)
    expect(await trainingsService.findAll()).toHaveLength(all.length)
  })

  it('remembers manual assignments for later imports', async () => {
    const ania = all.find((t) => t.clientName === 'Ania')!
    const annaId = byClientName('Anna Nowak')[0].client!.id

    await trainingsService.assignClient({
      trainingId: ania.id,
      clientId: annaId,
    })
    await importer.importAll({ now })

    const after = await trainingsService.findAll()
    expect(after.find((t) => t.id === ania.id)?.client?.id).toBe(annaId)
    expect(
      after.filter((t) => !t.client).every((t) => t.clientName === 'Ewa'),
    ).toBe(true)
  })
})
