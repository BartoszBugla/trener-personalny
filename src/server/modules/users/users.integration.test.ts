import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { beforeAll, describe, expect, it } from 'vitest'

import { AppModule } from '../../app.module'
import type { DB } from '../../core/database/database.module'
import { createContainer } from '../../core/di/container'
import { TOKENS } from '../../core/di/tokens'
import { TrainingsRepository } from '../trainings/trainings.repository'
import type { TrainingStatus } from '../trainings/trainings.table'
import { AccessService } from '../auth/access.service'
import { UsersService } from './users.service'
import type { AuthUser } from '#/shared/auth/auth.dto'
import type { CreateUserValues } from '#/shared/users/users.dto'

describe('UsersService.list (integration)', () => {
  const now = new Date('2026-11-08T12:00:00Z')
  let service: UsersService
  let access: AccessService
  const names = async (query: Parameters<UsersService['list']>[0]) =>
    (await service.list(query, now)).items.map((u) => u.name)

  beforeAll(async () => {
    process.env.DATABASE_URL = ':memory:'
    process.env.NODE_ENV = 'production'
    process.env.LOG_LEVEL = 'error'
    const container = createContainer(AppModule)
    migrate(container.get<DB>(TOKENS.Database), { migrationsFolder: 'drizzle' })
    service = container.get(UsersService)
    access = container.get(AccessService)
    const trainings = container.get(TrainingsRepository)

    const create = (user: Partial<CreateUserValues> & { name: string }) =>
      service.create({
        email: undefined,
        phone: undefined,
        isTrainer: false,
        ...user,
      })
    const kacper = await create({ name: 'Kacper Kopeć', isTrainer: true })
    const lukasz = await create({
      name: 'Łukasz Nowak',
      email: 'lukasz_n@example.com',
      phone: '+48 600 100 200',
    })
    const anna = await create({
      name: 'Anna Zielińska',
      email: 'anna@example.com',
    })
    await create({ name: 'Robert' })

    let uid = 0
    const add = (
      clientId: number,
      iso: string,
      status: TrainingStatus = 'confirmed',
    ) =>
      trainings.create({
        trainerId: kacper.id,
        clientId,
        startsAt: new Date(iso),
        endsAt: new Date(iso),
        status,
        title: 'x',
        source: 'ics',
        externalId: `t${uid++}`,
      })
    await add(lukasz.id, '2026-11-02T08:00:00Z')
    await add(lukasz.id, '2026-11-05T08:00:00Z')
    await add(lukasz.id, '2026-11-20T08:00:00Z') // planned – counted, not "last"
    await add(anna.id, '2026-10-01T08:00:00Z')
    await add(anna.id, '2026-11-06T08:00:00Z', 'cancelled')
  })

  it('sorts by name with Polish letters in place', async () => {
    expect(await names({})).toEqual([
      'Anna Zielińska',
      'Łukasz Nowak',
      'Robert',
    ])
  })

  it('splits app users (and trainers) from clients', async () => {
    expect(await names({ group: 'app' })).toEqual(['Kacper Kopeć'])
    expect(await names({ group: 'clients' })).not.toContain('Kacper Kopeć')
  })

  it('reports training stats and sorts by them', async () => {
    const page = await service.list({ sortBy: 'trainings', sort: 'desc' }, now)
    expect(
      page.items.map((u) => [u.name, u.trainingCount, u.lastTrainingAt]),
    ).toEqual([
      ['Łukasz Nowak', 3, '2026-11-05T08:00:00.000Z'],
      ['Anna Zielińska', 1, '2026-10-01T08:00:00.000Z'],
      ['Robert', 0, null],
    ])
    const [kacper] = (await service.list({ group: 'app' }, now)).items
    expect(kacper.trainingCount).toBe(4) // as trainer
    // Users who never trained go last in both directions.
    expect((await names({ sortBy: 'lastTraining', sort: 'asc' })).at(-1)).toBe(
      'Robert',
    )
  })

  it('filters by search, role and missing phone', async () => {
    expect(await names({ q: 'lukasz' })).toEqual(['Łukasz Nowak'])
    expect(await names({ q: 'lukasz_n@' })).toEqual(['Łukasz Nowak'])
    expect(await names({ q: '600 100' })).toEqual(['Łukasz Nowak'])
    expect(await names({ q: '%' })).toEqual([])
    expect(await names({ group: 'app', role: 'trainers' })).toEqual([
      'Kacper Kopeć',
    ])
    expect(await names({ noPhone: true })).toEqual(['Anna Zielińska', 'Robert'])
  })

  it('paginates and clamps pages past the end', async () => {
    const page = await service.list({ pageSize: 25, page: 7 }, now)
    expect(page).toMatchObject({ total: 3, page: 1, pageCount: 1 })
  })

  describe('app access', () => {
    const admin: AuthUser = {
      uid: 'u1',
      email: 'admin@example.com',
      name: null,
      picture: null,
    }

    it('adds an app user who can sign in', async () => {
      const user = await access.createAppUser({
        name: 'Ola Trenerka',
        email: ' Ola@Example.com ',
        isTrainer: false,
      })
      expect(user).toMatchObject({ email: 'ola@example.com', appAccess: true })
      expect(await access.hasAccess('OLA@example.com')).toBe(true)
      expect(await names({ group: 'app' })).toContain('Ola Trenerka')
    })

    it('rejects an email that belongs to someone else', async () => {
      await expect(
        access.createAppUser({
          name: 'Ktoś',
          email: 'anna@example.com',
          isTrainer: false,
        }),
      ).rejects.toMatchObject({ status: 409 })
    })

    it('moves a client to app users and back', async () => {
      const [robert] = (await service.list({ q: 'robert' }, now)).items
      expect(await access.hasAccess('robert@example.com')).toBe(false)

      await access.grantAccess({ id: robert.id, email: 'robert@example.com' })
      expect(await access.hasAccess('robert@example.com')).toBe(true)
      expect(await names({ q: 'robert' })).toEqual([])
      expect(await names({ group: 'app', q: 'robert' })).toEqual(['Robert'])

      await access.revokeAccess({ id: robert.id }, admin)
      expect(await access.hasAccess('robert@example.com')).toBe(false)
      expect(await names({ q: 'robert' })).toEqual(['Robert']) // keeps email
    })

    it('requires an email and refuses to revoke your own access', async () => {
      const [anna] = (await service.list({ q: 'anna' }, now)).items
      await expect(
        access.grantAccess({ id: anna.id, email: '' }),
      ).rejects.toBeDefined()

      const ola = (await service.list({ group: 'app', q: 'ola' }, now)).items[0]
      await expect(
        access.revokeAccess(
          { id: ola.id },
          { ...admin, email: 'ola@example.com' },
        ),
      ).rejects.toMatchObject({ status: 400 })
    })
  })
})
