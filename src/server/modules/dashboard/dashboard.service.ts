import { and, gte, inArray, lt } from 'drizzle-orm'
import { inject, injectable } from 'inversify'

import type { DB } from '../../core/database/database.module'
import { TOKENS } from '../../core/di/tokens'
import { toLocalDate } from '../../core/time/local-date'
import { BillingService } from '../billing/billing.service'
import { TrainingsRepository } from '../trainings/trainings.repository'
import { TrainingsService } from '../trainings/trainings.service'
import {
  ACTIVE_TRAINING_STATUSES,
  trainings,
} from '../trainings/trainings.table'
import { UsersService } from '../users/users.service'
import {
  computeDashboardStats,
  statsWindowEnd,
  statsWindowStart,
} from './dashboard-stats'
import type { StatsTraining } from './dashboard-stats'
import type { BillingOverview } from '#/shared/billing/billing.dto'
import type { DashboardSummary } from '#/shared/dashboard/dashboard.dto'

/** Today's schedule is short; this only guards against a runaway calendar. */
const TODAY_LIMIT = 100

/**
 * Read model for the home dashboard: training stats, today's schedule and
 * the to-do counts from other modules (unassigned trainings, billing).
 */
@injectable()
export class DashboardService {
  constructor(
    @inject(TOKENS.Database) private readonly db: DB,
    @inject(TrainingsService) private readonly trainings: TrainingsService,
    @inject(TrainingsRepository)
    private readonly trainingsRepo: TrainingsRepository,
    @inject(BillingService) private readonly billing: BillingService,
    @inject(UsersService) private readonly users: UsersService,
  ) {}

  async getSummary(now = new Date()): Promise<DashboardSummary> {
    const today = toLocalDate(now)
    const [rows, todayPage, overview, unassigned, people] = await Promise.all([
      this.loadStatsRows(now),
      this.trainings.list({
        from: today,
        to: today,
        sortBy: 'date',
        sort: 'asc',
        pageSize: TODAY_LIMIT,
      }),
      this.billing.getOverview(now),
      this.trainingsRepo.countUnassigned(),
      this.users.findAll(),
    ])
    const { topClients, ...stats } = computeDashboardStats(rows, now)
    const names = new Map(people.map((u) => [u.id, u.name]))

    return {
      ...stats,
      today,
      generatedAt: now.toISOString(),
      topClients: topClients.map(({ clientId, count }) => ({
        id: clientId,
        name: names.get(clientId) ?? `#${clientId}`,
        count,
      })),
      todayTrainings: todayPage.items,
      todo: {
        unassigned,
        smsDue: countSmsDue(overview),
        withoutPlan: overview.withoutPlan.filter(
          (c) => c.firstTrainingOn !== null,
        ).length,
      },
    }
  }

  private loadStatsRows(now: Date): Promise<Array<StatsTraining>> {
    return this.db
      .select({
        startsAt: trainings.startsAt,
        status: trainings.status,
        clientId: trainings.clientId,
      })
      .from(trainings)
      .where(
        and(
          inArray(trainings.status, [...ACTIVE_TRAINING_STATUSES]),
          gte(trainings.startsAt, statsWindowStart(now)),
          lt(trainings.startsAt, statsWindowEnd(now)),
        ),
      ) as Promise<Array<StatsTraining>>
  }
}

/** Same rule as the billing screen's badges. */
function countSmsDue(overview: BillingOverview): number {
  const periods = overview.individual.reduce(
    (n, row) =>
      n + row.periods.filter((p) => p.complete && !p.smsSentAt).length,
    0,
  )
  const packages = overview.family.reduce(
    (n, row) =>
      n + row.packages.filter((p) => p.complete && !p.smsSentAt).length,
    0,
  )
  return periods + packages
}
