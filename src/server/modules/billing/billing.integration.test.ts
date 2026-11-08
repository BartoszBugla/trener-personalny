import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Container } from 'inversify'

import { AppModule } from '../../app.module'
import type { DB } from '../../core/database/database.module'
import { createContainer } from '../../core/di/container'
import { TOKENS } from '../../core/di/tokens'
import { BadRequestException } from '../../core/errors/http-exceptions'
import { CalendarImportService } from '../calendar-import/calendar-import.service'
import { UsersService } from '../users/users.service'
import { BillingService } from './billing.service'

/** Billing on top of the real imported calendars. */
describe('BillingService (integration)', () => {
  const now = new Date('2026-11-08T12:00:00Z')
  let container: Container
  let billing: BillingService
  const ids: Record<string, number> = {}

  beforeAll(async () => {
    process.env.DATABASE_URL = ':memory:'
    process.env.NODE_ENV = 'production'
    process.env.LOG_LEVEL = 'error'
    container = createContainer(AppModule)
    migrate(container.get<DB>(TOKENS.Database), { migrationsFolder: 'drizzle' })
    await container.get(CalendarImportService).importAll({ now })
    billing = container.get(BillingService)
    for (const u of await container.get(UsersService).findAll()) {
      ids[u.name] = u.id
    }
  })

  afterAll(() => container.unbindAll())

  it('lists every client without a plan at first', async () => {
    const overview = await billing.getOverview(now)
    expect(overview.individual).toEqual([])
    expect(overview.withoutPlan.map((p) => p.name)).toContain('Anna Nowak')
    expect(overview.withoutPlan.some((p) => p.name === 'Kamil')).toBe(false)
  })

  it('groups "every 4 trainings" periods by attended trainings', async () => {
    await billing.assignPlan({
      userId: ids['Anna Nowak'],
      planType: 'trainings_4',
      validFrom: '2026-09-01',
    })
    const row = (await billing.getOverview(now)).individual.find(
      (r) => r.client.name === 'Anna Nowak',
    )!
    const chronological = [...row.periods].reverse()
    // Series Mon/Thu from 3 Sep at 17:00 Warsaw: 3, 7, 10, 14 Sep.
    expect(chronological[0]).toMatchObject({
      startsAt: '2026-09-03T15:00:00.000Z',
      endsAt: '2026-09-14T15:00:00.000Z',
      trainingCount: 4,
      targetCount: 4,
      complete: true,
      smsSentAt: null,
    })
    expect(chronological.slice(0, -1).every((p) => p.complete)).toBe(true)
  })

  it('ticks the SMS checkbox only for finished periods', async () => {
    const userId = ids['Anna Nowak']
    const { plans } = await billing.getUserHistory(userId, now)
    const [current] = plans
    const first = current.periods.at(-1)!
    const open = current.periods[0]

    await billing.setPeriodSms(
      { clientPlanId: current.id, startsAt: first.startsAt, sent: true },
      now,
    )
    const after = await billing.getUserHistory(userId, now)
    expect(after.plans[0].periods.at(-1)?.smsSentAt).not.toBeNull()

    // 19 attended trainings so far = 4 × 4 + 3 → current period is 3/4.
    expect(open).toMatchObject({ trainingCount: 3, complete: false })
    await expect(
      billing.setPeriodSms(
        { clientPlanId: current.id, startsAt: open.startsAt, sent: true },
        now,
      ),
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  it('bills monthly plans per calendar month', async () => {
    await billing.assignPlan({
      userId: ids['Marek Lewandowski'],
      planType: 'monthly',
      validFrom: '2026-09-01',
    })
    const row = (await billing.getOverview(now)).individual.find(
      (r) => r.client.name === 'Marek Lewandowski',
    )!
    expect(row.periods.map((p) => p.complete)).toEqual([false, true, true])
    expect(row.periods.reduce((n, p) => n + p.trainingCount, 0)).toBe(10)
  })

  it('shares family packages between members', async () => {
    const group = await billing.createFamilyGroup({ name: 'Kowalscy' })
    for (const name of ['Jan Kowalski', 'Maria Kowalska']) {
      await billing.assignPlan({
        userId: ids[name],
        planType: 'family',
        validFrom: '2026-09-01',
        familyGroupId: group.id,
      })
    }
    await billing.createFamilyPackage({
      familyGroupId: group.id,
      size: 10,
      startsOn: '2026-09-01',
    })
    await billing.createFamilyPackage({
      familyGroupId: group.id,
      size: 5,
      startsOn: '2026-09-01',
    })

    const row = (await billing.getOverview(now)).family.find(
      (f) => f.group.id === group.id,
    )!
    expect(row.members.map((m) => m.name).sort()).toEqual([
      'Jan Kowalski',
      'Maria Kowalska',
    ])
    // 19 trainings (Maria 10 + Jan 9): 10 + 5 covered, 4 need a new package.
    expect(row.packages.map((p) => [p.size, p.used, p.complete])).toEqual(
      expect.arrayContaining([
        [10, 10, true],
        [5, 5, true],
      ]),
    )
    expect(row.uncoveredTrainings).toBe(4)

    await billing.setPackageSms({ packageId: row.packages[0].id, sent: true })
    const updated = (await billing.getOverview(now)).family[0]
    expect(updated.packages[0].smsSentAt).not.toBeNull()
  })

  it('records "paid" notes for periods and packages without freezing them', async () => {
    const row = () =>
      billing
        .getOverview(now)
        .then((o) =>
          o.individual.find((r) => r.client.name === 'Marek Lewandowski')!,
        )
    const [current, previous] = (await row()).periods
    expect(current.complete).toBe(false) // in progress – still allowed

    await billing.setPeriodPayment(
      {
        clientPlanId: (await row()).plan.id,
        startsAt: current.startsAt,
        note: '  przelew 03.11 ',
      },
      now,
    )
    await billing.setPeriodPayment(
      {
        clientPlanId: (await row()).plan.id,
        startsAt: previous.startsAt,
        note: 'gotówka',
      },
      now,
    )
    let periods = (await row()).periods
    expect(periods.map((p) => p.paymentNote)).toEqual([
      'przelew 03.11',
      'gotówka',
      null,
    ])
    expect(periods[0].smsSentAt).toBeNull() // not frozen

    // Empty text clears the note; unknown periods are rejected.
    await billing.setPeriodPayment(
      {
        clientPlanId: (await row()).plan.id,
        startsAt: previous.startsAt,
        note: '',
      },
      now,
    )
    periods = (await row()).periods
    expect(periods[1].paymentNote).toBeNull()
    await expect(
      billing.setPeriodPayment(
        {
          clientPlanId: (await row()).plan.id,
          startsAt: '2020-01-01T00:00:00.000Z',
          note: 'x',
        },
        now,
      ),
    ).rejects.toMatchObject({ status: 404 })

    // A plan with recorded payments can't be moved – its periods would shift.
    await expect(
      billing.correctPlan({
        planId: (await row()).plan.id,
        validFrom: '2026-08-01',
      }),
    ).rejects.toMatchObject({ status: 400 })

    const pkg = (await billing.getOverview(now)).family[0].packages[0]
    await billing.setPackagePayment({ packageId: pkg.id, note: 'BLIK 400 zł' })
    expect(
      (await billing.getOverview(now)).family[0].packages[0].paymentNote,
    ).toBe('BLIK 400 zł')
  })

  it('suggests the first training as plan start for clients without plan', async () => {
    const { withoutPlan } = await billing.getOverview(now)
    const tomasz = withoutPlan.find((c) => c.name === 'Tomasz Wójcik')
    expect(tomasz?.firstTrainingOn).toBe('2026-09-02')
  })

  it('makes the first plan cover all past trainings', async () => {
    const userId = ids['Tomasz Wójcik']
    const plan = await billing.assignPlan({
      userId,
      planType: 'trainings_8',
      validFrom: '2026-11-08', // ignored for a first plan
    })
    expect(plan).toMatchObject({ validFrom: '2026-09-02', coversHistory: true })

    const row = (await billing.getOverview(now)).individual.find(
      (r) => r.client.id === userId,
    )
    const chronological = [...(row?.periods ?? [])].reverse()
    expect(chronological[0]).toMatchObject({
      trainingCount: 8,
      complete: true,
    })
    expect(chronological[0].startsAt.slice(0, 10)).toBe('2026-09-02')

    await expect(
      billing.correctPlan({ planId: plan.id, validFrom: '2026-10-01' }),
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  it('lets a mistaken plan change be corrected or removed before any SMS', async () => {
    const userId = ids['Tomasz Wójcik']
    const second = await billing.assignPlan({
      userId,
      planType: 'monthly',
      validFrom: '2026-11-01',
    })
    expect(second.coversHistory).toBe(false)

    await billing.correctPlan({ planId: second.id, validFrom: '2026-10-01' })
    let history = await billing.getUserHistory(userId, now)
    expect(
      history.plans.map((p) => [p.planType, p.validFrom, p.validTo]),
    ).toEqual([
      ['monthly', '2026-10-01', null],
      ['trainings_8', '2026-09-02', '2026-10-01'],
    ])

    await billing.removePlan(second.id)
    history = await billing.getUserHistory(userId, now)
    expect(
      history.plans.map((p) => [p.planType, p.validTo, p.coversHistory]),
    ).toEqual([['trainings_8', null, true]])
  })

  it('refuses to correct a plan once an SMS was sent', async () => {
    const { plans } = await billing.getUserHistory(ids['Anna Nowak'], now)
    await expect(
      billing.correctPlan({ planId: plans[0].id, validFrom: '2026-09-02' }),
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  it('keeps history when a client changes plan', async () => {
    const userId = ids['Anna Nowak']
    await expect(
      billing.assignPlan({
        userId,
        planType: 'monthly',
        validFrom: '2026-09-01',
      }),
    ).rejects.toBeInstanceOf(BadRequestException)

    await billing.assignPlan({
      userId,
      planType: 'monthly',
      validFrom: '2026-10-01',
    })
    const history = await billing.getUserHistory(userId, now)
    expect(
      history.plans.map((p) => [p.planType, p.validFrom, p.validTo]),
    ).toEqual([
      ['monthly', '2026-10-01', null],
      ['trainings_4', '2026-09-03', '2026-10-01'],
    ])
    // Old plan keeps its periods (incl. the ticked SMS) for September only.
    const old = history.plans[1].periods
    expect(old.at(-1)?.smsSentAt).not.toBeNull()
    expect(old.every((p) => p.endsAt < '2026-10-01')).toBe(true)

    const overview = await billing.getOverview(now)
    expect(
      overview.individual.find((r) => r.client.id === userId)?.plan.planType,
    ).toBe('monthly')
  })
})
