import {
  addLocalDays,
  monthStart,
  nextMonthStart,
  startOfLocalDay,
  toLocalDate,
  weekStart,
} from '../../core/time/local-date'
import type { DashboardStats } from '#/shared/dashboard/dashboard.dto'

export interface StatsTraining {
  startsAt: Date
  status: 'confirmed' | 'cancelled'
  clientId: number | null
}

export const WEEKS_SHOWN = 12
const ROLLING_DAYS = 30
const TOP_CLIENTS = 5
const DAY_MS = 24 * 60 * 60 * 1000

/** Earliest instant `computeDashboardStats` looks at (for the DB query). */
export function statsWindowStart(now: Date): Date {
  const today = toLocalDate(now)
  const firstWeek = startOfLocalDay(
    addLocalDays(weekStart(today), -7 * (WEEKS_SHOWN - 1)),
  )
  const previousMonth = startOfLocalDay(
    monthStart(addLocalDays(monthStart(today), -1)),
  )
  const rolling = new Date(now.getTime() - 2 * ROLLING_DAYS * DAY_MS)
  return new Date(
    Math.min(firstWeek.getTime(), previousMonth.getTime(), rolling.getTime()),
  )
}

/** Latest instant (exclusive) `computeDashboardStats` looks at. */
export function statsWindowEnd(now: Date): Date {
  const today = toLocalDate(now)
  return new Date(
    Math.max(
      startOfLocalDay(addLocalDays(weekStart(today), 7)).getTime(),
      startOfLocalDay(nextMonthStart(today)).getTime(),
    ),
  )
}

/**
 * Dashboard figures from confirmed/cancelled trainings. Pure; weeks (Mon–Sun)
 * and months are local (Europe/Warsaw). "Done" = confirmed and already
 * started; comparisons use the same span of the previous period, so a
 * Wednesday isn't compared with a whole week.
 */
export function computeDashboardStats(
  trainings: Array<StatsTraining>,
  now: Date,
): DashboardStats {
  const t = now.getTime()
  const done = trainings.filter(
    (x) => x.status === 'confirmed' && x.startsAt.getTime() <= t,
  )
  const confirmed = trainings.filter((x) => x.status === 'confirmed')
  const countIn = (rows: Array<StatsTraining>, from: number, to: number) =>
    rows.filter(
      (x) => x.startsAt.getTime() >= from && x.startsAt.getTime() < to,
    ).length
  const instant = (date: string) => startOfLocalDay(date).getTime()

  const today = toLocalDate(now)

  // Week: this week so far vs last week up to the same moment.
  const thisWeek = weekStart(today)
  const weekFrom = instant(thisWeek)
  const weekTo = instant(addLocalDays(thisWeek, 7))
  const lastWeekFrom = instant(addLocalDays(thisWeek, -7))
  const week = {
    current: countIn(done, weekFrom, t + 1),
    previous: countIn(done, lastWeekFrom, lastWeekFrom + (t + 1 - weekFrom)),
    planned: countIn(confirmed, t + 1, weekTo),
  }

  // Month: so far vs the same span of last month (capped at its end).
  const thisMonth = monthStart(today)
  const monthFrom = instant(thisMonth)
  const lastMonthFrom = instant(monthStart(addLocalDays(thisMonth, -1)))
  const month = {
    current: countIn(done, monthFrom, t + 1),
    previous: countIn(
      done,
      lastMonthFrom,
      Math.min(lastMonthFrom + (t + 1 - monthFrom), monthFrom),
    ),
    planned: countIn(confirmed, t + 1, instant(nextMonthStart(today))),
  }

  // Rolling 30-day windows: (now-30d, now] and the 30 days before.
  const windowMs = ROLLING_DAYS * DAY_MS
  const inWindow = (x: StatsTraining, offset: number) => {
    const s = x.startsAt.getTime()
    return s > t - windowMs * (offset + 1) && s <= t - windowMs * offset
  }
  const clientsIn = (offset: number) =>
    new Set(
      done
        .filter((x) => x.clientId !== null && inWindow(x, offset))
        .map((x) => x.clientId),
    ).size
  const cancellationIn = (offset: number) => {
    const held = trainings.filter(
      (x) => x.startsAt.getTime() <= t && inWindow(x, offset),
    )
    if (held.length === 0) return null
    return held.filter((x) => x.status === 'cancelled').length / held.length
  }

  const weekly = Array.from({ length: WEEKS_SHOWN }, (_, i) => {
    const start = addLocalDays(thisWeek, -7 * (WEEKS_SHOWN - 1 - i))
    return {
      weekStart: start,
      count: countIn(done, instant(start), instant(addLocalDays(start, 7))),
      current: start === thisWeek,
    }
  })

  const perClient = new Map<number, number>()
  for (const x of done) {
    if (x.clientId === null || !inWindow(x, 0)) continue
    perClient.set(x.clientId, (perClient.get(x.clientId) ?? 0) + 1)
  }
  const topClients = [...perClient]
    .map(([clientId, count]) => ({ clientId, count }))
    .sort((a, b) => b.count - a.count || a.clientId - b.clientId)
    .slice(0, TOP_CLIENTS)

  return {
    week,
    month,
    activeClients: { current: clientsIn(0), previous: clientsIn(1) },
    cancellationRate: {
      current: cancellationIn(0),
      previous: cancellationIn(1),
    },
    weekly,
    topClients,
  }
}
