import { inject, injectable } from 'inversify'

import {
  BadRequestException,
  NotFoundException,
} from '../../core/errors/http-exceptions'
import { LoggerService } from '../../core/logger/logger.service'
import { TrainingsRepository } from '../trainings/trainings.repository'
import { UsersRepository } from '../users/users.repository'
import type { UserRow } from '../users/users.table'
import {
  computeMonthlyPeriods,
  computePackageUsage,
  computeTrainingPeriods,
  isWithinValidity,
} from './billing-periods'
import { toLocalDate } from '../../core/time/local-date'
import type { ComputedPeriod, FrozenPeriod } from './billing-periods'
import { BillingRepository } from './billing.repository'
import type {
  BillingPeriodRow,
  ClientPlanRow,
  FamilyGroupRow,
} from './billing.table'
import {
  PLAN_PERIOD_SIZE,
  setPackagePaymentSchema,
  setPeriodPaymentSchema,
} from '#/shared/billing/billing.dto'
import type {
  AssignPlanDto,
  BillingOverview,
  BillingPeriod,
  CorrectPlanDto,
  CreateFamilyGroupDto,
  CreateFamilyPackageDto,
  FamilyBillingRow,
  IndividualBillingRow,
  PersonRef,
  PlanSummary,
  SetPackagePaymentDto,
  SetPackageSmsDto,
  SetPeriodPaymentDto,
  SetPeriodSmsDto,
  UserBillingHistory,
} from '#/shared/billing/billing.dto'

/** Everything the calculations need, loaded once per request. */
interface BillingData {
  users: Map<number, UserRow>
  groups: Map<number, FamilyGroupRow>
  plans: Array<ClientPlanRow>
  frozenByPlan: Map<number, Array<FrozenPeriod>>
  /** Each user's earliest plan – it has no lower bound (covers all history). */
  firstPlanIds: Set<number>
  trainingsByClient: Map<number, Array<Date>>
  /** "Paid" notes by `paymentKey(planId, periodStart)`. */
  paymentNotes: Map<string, string>
}

@injectable()
export class BillingService {
  constructor(
    @inject(BillingRepository) private readonly repo: BillingRepository,
    @inject(UsersRepository) private readonly users: UsersRepository,
    @inject(TrainingsRepository)
    private readonly trainings: TrainingsRepository,
    @inject(LoggerService) private readonly logger: LoggerService,
  ) {}

  async getOverview(now = new Date()): Promise<BillingOverview> {
    const data = await this.load(now)
    const openPlans = data.plans.filter((p) => p.validTo === null)

    const individual: Array<IndividualBillingRow> = openPlans
      .filter((p) => p.planType !== 'family')
      .map((plan) => ({
        client: this.person(data, plan.userId),
        plan: this.planSummary(data, plan),
        periods: this.billingPeriods(data, plan, now),
      }))
      .sort((a, b) => a.client.name.localeCompare(b.client.name, 'pl'))

    const family = await this.familyRows(data)

    const withPlan = new Set(openPlans.map((p) => p.userId))
    const withoutPlan = [...data.users.values()]
      .filter((u) => !u.isTrainer && !withPlan.has(u.id))
      .map((u) => {
        const first = data.trainingsByClient.get(u.id)?.[0]
        return {
          id: u.id,
          name: u.name,
          firstTrainingOn: first ? toLocalDate(first) : null,
        }
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'pl'))

    return {
      individual,
      family,
      withoutPlan,
      familyGroups: [...data.groups.values()].map((g) => ({
        id: g.id,
        name: g.name,
      })),
    }
  }

  async getUserHistory(
    userId: number,
    now = new Date(),
  ): Promise<UserBillingHistory> {
    const data = await this.load(now)
    if (!data.users.has(userId)) {
      throw new NotFoundException({
        key: 'userNotFound',
        params: { id: userId },
      })
    }
    const plans = data.plans
      .filter((p) => p.userId === userId)
      .sort((a, b) => b.validFrom.localeCompare(a.validFrom) || b.id - a.id)
    return {
      client: this.person(data, userId),
      plans: plans.map((plan) => ({
        ...this.planSummary(data, plan),
        periods:
          plan.planType === 'family'
            ? []
            : this.billingPeriods(data, plan, now),
      })),
    }
  }

  /**
   * Puts a user on a plan from `validFrom`. The current plan (if any) is closed
   * the day before – history is never rewritten.
   */
  async assignPlan(dto: AssignPlanDto): Promise<PlanSummary> {
    const user = await this.users.findById(dto.userId)
    if (!user)
      throw new NotFoundException({
        key: 'userNotFound',
        params: { id: dto.userId },
      })
    if (dto.planType === 'family') {
      const group = await this.repo.findGroupById(dto.familyGroupId ?? 0)
      if (!group) {
        throw new NotFoundException({
          key: 'familyGroupNotFound',
          params: { id: dto.familyGroupId ?? 0 },
        })
      }
    }

    const current = await this.repo.findOpenPlan(dto.userId)
    const isFirstPlan =
      (await this.repo.findPlansByUser(dto.userId)).length === 0
    // First plan: covers all history; store the first training as its start.
    const validFrom = isFirstPlan
      ? await this.firstTrainingDay(dto.userId)
      : dto.validFrom
    if (!validFrom) {
      throw new BadRequestException({ key: 'planStartRequired' })
    }
    if (current) {
      if (validFrom <= current.validFrom) {
        throw new BadRequestException({
          key: 'planMustStartAfter',
          params: { date: current.validFrom },
        })
      }
      if (
        current.planType === dto.planType &&
        (current.familyGroupId ?? undefined) === dto.familyGroupId
      ) {
        throw new BadRequestException({
          key: 'alreadyOnPlan',
          params: { name: user.name },
        })
      }
      await this.repo.closePlan(current.id, validFrom)
    }

    const plan = await this.repo.createPlan({
      userId: dto.userId,
      planType: dto.planType,
      familyGroupId: dto.planType === 'family' ? dto.familyGroupId : null,
      validFrom,
    })
    this.logger.info('Billing plan assigned', {
      userId: dto.userId,
      planType: dto.planType,
      validFrom,
      previousPlanId: current?.id,
    })
    return this.planSummary(await this.load(), plan)
  }

  /**
   * Ticks / unticks "reminder SMS sent" for a billing period. Ticking freezes
   * the period's boundaries; only complete periods can be ticked.
   */
  async setPeriodSms(dto: SetPeriodSmsDto, now = new Date()): Promise<void> {
    const plan = await this.repo.findPlanById(dto.clientPlanId)
    if (!plan) {
      throw new NotFoundException({
        key: 'planNotFound',
        params: { id: dto.clientPlanId },
      })
    }
    if (plan.planType === 'family') {
      throw new BadRequestException({ key: 'familyBilledPerPackage' })
    }
    const startsAt = new Date(dto.startsAt)

    if (!dto.sent) {
      await this.repo.deletePeriod(plan.id, startsAt)
      return
    }

    const data = await this.load(now)
    const period = this.periodsFor(data, plan, now).find(
      (p) => p.startsAt.getTime() === startsAt.getTime(),
    )
    if (!period) throw new NotFoundException({ key: 'periodNotFound' })
    if (period.smsSentAt) return
    if (!period.complete) {
      throw new BadRequestException({ key: 'periodNotFinished' })
    }
    await this.repo.createPeriod({
      clientPlanId: plan.id,
      startsAt: period.startsAt,
      endsAt: period.endsAt,
      trainingCount: period.trainingCount,
      smsSentAt: now,
    })
  }

  /**
   * Corrects the start date of a user's current plan – for fixing mistakes,
   * so only allowed before any reminder SMS was sent for it. The previous
   * plan (if any) is kept adjacent: it now ends where the corrected one starts.
   */
  async correctPlan(dto: CorrectPlanDto): Promise<void> {
    const { plan, previous } = await this.getCorrectablePlan(dto.planId)
    if (!previous) {
      throw new BadRequestException({ key: 'firstPlanCoversHistory' })
    }
    if (dto.validFrom <= previous.validFrom) {
      throw new BadRequestException({
        key: 'mustStartAfterPrevious',
        params: { date: previous.validFrom },
      })
    }
    await this.repo.updatePlan(previous.id, { validTo: dto.validFrom })
    await this.repo.updatePlan(plan.id, { validFrom: dto.validFrom })
    this.logger.info('Billing plan corrected', {
      planId: plan.id,
      from: plan.validFrom,
      to: dto.validFrom,
    })
  }

  /**
   * Removes a user's current plan assigned by mistake (only before any SMS was
   * sent for it); the previous plan, if any, becomes current again.
   */
  async removePlan(planId: number): Promise<void> {
    const { plan, previous } = await this.getCorrectablePlan(planId)
    await this.repo.deletePlan(plan.id)
    if (previous) await this.repo.updatePlan(previous.id, { validTo: null })
    this.logger.info('Billing plan removed', { planId: plan.id })
  }

  /** Local date of the user's first attended training, or today. */
  private async firstTrainingDay(userId: number): Promise<string> {
    const data = await this.load()
    const first = data.trainingsByClient.get(userId)?.[0]
    return toLocalDate(first ?? new Date())
  }

  private async getCorrectablePlan(planId: number) {
    const plan = await this.repo.findPlanById(planId)
    if (!plan)
      throw new NotFoundException({
        key: 'planNotFound',
        params: { id: planId },
      })
    if (plan.validTo !== null) {
      throw new BadRequestException({ key: 'onlyCurrentPlan' })
    }
    if ((await this.repo.findPeriodsByPlan(plan.id)).length > 0) {
      throw new BadRequestException({ key: 'smsAlreadySent' })
    }
    // Moving the plan's start shifts its periods – recorded payments would
    // no longer match them.
    if ((await this.repo.countPaymentNotesByPlan(plan.id)) > 0) {
      throw new BadRequestException({ key: 'paymentAlreadyRecorded' })
    }
    const previous = (await this.repo.findPlansByUser(plan.userId)).find(
      (p) => p.id !== plan.id && p.validTo === plan.validFrom,
    )
    return { plan, previous }
  }

  async createFamilyGroup(dto: CreateFamilyGroupDto): Promise<PersonRef> {
    const group = await this.repo.createGroup(dto.name)
    return { id: group.id, name: group.name }
  }

  async createFamilyPackage(dto: CreateFamilyPackageDto): Promise<void> {
    const group = await this.repo.findGroupById(dto.familyGroupId)
    if (!group) {
      throw new NotFoundException({
        key: 'familyGroupNotFound',
        params: { id: dto.familyGroupId ?? 0 },
      })
    }
    await this.repo.createPackage({
      familyGroupId: dto.familyGroupId,
      size: dto.size,
      startsOn: dto.startsOn,
      notes: dto.notes || null,
    })
  }

  /**
   * Saves the "paid" note of a period (any period, also one in progress –
   * doesn't freeze it). Empty text clears the note.
   */
  async setPeriodPayment(
    input: SetPeriodPaymentDto,
    now = new Date(),
  ): Promise<void> {
    const dto = setPeriodPaymentSchema.parse(input)
    const plan = await this.repo.findPlanById(dto.clientPlanId)
    if (!plan) {
      throw new NotFoundException({
        key: 'planNotFound',
        params: { id: dto.clientPlanId },
      })
    }
    if (plan.planType === 'family') {
      throw new BadRequestException({ key: 'familyBilledPerPackage' })
    }
    const startsAt = new Date(dto.startsAt)
    if (dto.note) {
      const data = await this.load(now)
      const exists = this.periodsFor(data, plan, now).some(
        (p) => p.startsAt.getTime() === startsAt.getTime(),
      )
      if (!exists) throw new NotFoundException({ key: 'periodNotFound' })
    }
    await this.repo.setPaymentNote(plan.id, startsAt, dto.note)
  }

  async setPackagePayment(input: SetPackagePaymentDto): Promise<void> {
    const dto = setPackagePaymentSchema.parse(input)
    const row = await this.repo.setPackagePaymentNote(
      dto.packageId,
      dto.note || null,
    )
    if (!row)
      throw new NotFoundException({
        key: 'packageNotFound',
        params: { id: dto.packageId },
      })
  }

  async setPackageSms(dto: SetPackageSmsDto, now = new Date()): Promise<void> {
    const row = await this.repo.setPackageSmsSentAt(
      dto.packageId,
      dto.sent ? now : null,
    )
    if (!row)
      throw new NotFoundException({
        key: 'packageNotFound',
        params: { id: dto.packageId },
      })
  }

  /* ---------- internals ---------- */

  /** Loads billing inputs; only trainings that already happened (≤ now) count. */
  private async load(now = new Date()): Promise<BillingData> {
    const [users, groups, plans, periods, trainings, notes] = await Promise.all(
      [
        this.users.findAll(),
        this.repo.findAllGroups(),
        this.repo.findAllPlans(),
        this.repo.findAllPeriods(),
        this.trainings.findConfirmedWithClient(),
        this.repo.findAllPaymentNotes(),
      ],
    )
    return {
      users: new Map(users.map((u) => [u.id, u])),
      groups: new Map(groups.map((g) => [g.id, g])),
      plans,
      frozenByPlan: groupBy(periods, (p) => p.clientPlanId, toFrozen),
      firstPlanIds: firstPlanIds(plans),
      paymentNotes: new Map(
        notes.map((n) => [
          paymentKey(n.clientPlanId, n.periodStartsAt),
          n.note,
        ]),
      ),
      trainingsByClient: groupBy(
        trainings.filter((t) => t.startsAt.getTime() <= now.getTime()),
        (t) => t.clientId,
        (t) => t.startsAt,
      ),
    }
  }

  /** Attended trainings of the plan's client during the plan's validity. */
  private trainingsInPlan(data: BillingData, plan: ClientPlanRow) {
    const validity = data.firstPlanIds.has(plan.id)
      ? { validFrom: BEGINNING, validTo: plan.validTo }
      : plan
    return (data.trainingsByClient.get(plan.userId) ?? []).filter((t) =>
      isWithinValidity(t, validity),
    )
  }

  /** Periods for the API: newest first, with their "paid" notes. */
  private billingPeriods(
    data: BillingData,
    plan: ClientPlanRow,
    now: Date,
  ): Array<BillingPeriod> {
    return this.periodsFor(data, plan, now)
      .reverse()
      .map((p) => ({
        ...toBillingPeriod(p),
        paymentNote:
          data.paymentNotes.get(paymentKey(plan.id, p.startsAt)) ?? null,
      }))
  }

  private periodsFor(
    data: BillingData,
    plan: ClientPlanRow,
    now: Date,
  ): Array<ComputedPeriod> {
    const trainings = this.trainingsInPlan(data, plan)
    const frozen = data.frozenByPlan.get(plan.id) ?? []
    const size = PLAN_PERIOD_SIZE[plan.planType]
    if (size) return computeTrainingPeriods(trainings, size, frozen)
    if (plan.planType === 'monthly') {
      // A first plan's months start with the client's first training.
      const firstDay = trainings[0] ? toLocalDate(trainings[0]) : null
      const validFrom =
        data.firstPlanIds.has(plan.id) && firstDay && firstDay < plan.validFrom
          ? firstDay
          : plan.validFrom
      return computeMonthlyPeriods(
        trainings,
        { validFrom, validTo: plan.validTo },
        now,
        frozen,
      )
    }
    return []
  }

  private async familyRows(
    data: BillingData,
  ): Promise<Array<FamilyBillingRow>> {
    const packages = await this.repo.findAllPackages()
    return [...data.groups.values()].map((group) => {
      const memberships = data.plans.filter(
        (p) => p.planType === 'family' && p.familyGroupId === group.id,
      )
      const trainings = memberships.flatMap((p) =>
        this.trainingsInPlan(data, p),
      )
      const groupPackages = packages.filter((p) => p.familyGroupId === group.id)
      const usage = computePackageUsage(groupPackages, trainings)
      const usageById = new Map(usage.packages.map((u) => [u.id, u]))

      return {
        group: { id: group.id, name: group.name },
        members: memberships
          .filter((p) => p.validTo === null)
          .map((p) => ({ ...this.person(data, p.userId), since: p.validFrom })),
        packages: groupPackages
          .map((p) => {
            const u = usageById.get(p.id)
            return {
              id: p.id,
              size: p.size,
              used: u?.used ?? 0,
              startsOn: p.startsOn,
              firstTrainingAt: u?.firstTrainingAt?.toISOString() ?? null,
              lastTrainingAt: u?.lastTrainingAt?.toISOString() ?? null,
              complete: u?.complete ?? false,
              smsSentAt: p.smsSentAt?.toISOString() ?? null,
              notes: p.notes,
              paymentNote: p.paymentNote,
            }
          })
          .sort((a, b) => b.startsOn.localeCompare(a.startsOn) || b.id - a.id),
        uncoveredTrainings: usage.uncovered,
      }
    })
  }

  private person(data: BillingData, userId: number): PersonRef {
    return { id: userId, name: data.users.get(userId)?.name ?? `#${userId}` }
  }

  private planSummary(data: BillingData, plan: ClientPlanRow): PlanSummary {
    const group = plan.familyGroupId
      ? data.groups.get(plan.familyGroupId)
      : undefined
    return {
      id: plan.id,
      planType: plan.planType,
      validFrom: plan.validFrom,
      validTo: plan.validTo,
      familyGroup: group ? { id: group.id, name: group.name } : null,
      coversHistory: data.firstPlanIds.has(plan.id),
    }
  }
}

/** Lower bound for a first plan: before any possible training. */
const BEGINNING = '0000-01-01'

/** Earliest plan (by start date, then id) of every user. */
function firstPlanIds(plans: Array<ClientPlanRow>): Set<number> {
  const first = new Map<number, ClientPlanRow>()
  for (const plan of plans) {
    const current = first.get(plan.userId)
    if (
      !current ||
      plan.validFrom < current.validFrom ||
      (plan.validFrom === current.validFrom && plan.id < current.id)
    ) {
      first.set(plan.userId, plan)
    }
  }
  return new Set([...first.values()].map((p) => p.id))
}

function toFrozen(row: BillingPeriodRow): FrozenPeriod {
  return {
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    trainingCount: row.trainingCount,
    smsSentAt: row.smsSentAt,
  }
}

function paymentKey(clientPlanId: number, periodStart: Date): string {
  return `${clientPlanId}|${periodStart.getTime()}`
}

function toBillingPeriod(
  p: ComputedPeriod,
): Omit<BillingPeriod, 'paymentNote'> {
  return {
    startsAt: p.startsAt.toISOString(),
    endsAt: p.endsAt.toISOString(),
    trainingCount: p.trainingCount,
    targetCount: p.targetCount,
    complete: p.complete,
    smsSentAt: p.smsSentAt?.toISOString() ?? null,
  }
}

function groupBy<T, K, V>(
  items: Array<T>,
  key: (item: T) => K,
  value: (item: T) => V,
): Map<K, Array<V>> {
  const map = new Map<K, Array<V>>()
  for (const item of items) {
    const k = key(item)
    const list = map.get(k)
    if (list) list.push(value(item))
    else map.set(k, [value(item)])
  }
  return map
}
