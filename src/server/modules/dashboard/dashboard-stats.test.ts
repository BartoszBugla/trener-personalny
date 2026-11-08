import { describe, expect, it } from 'vitest'

import {
  WEEKS_SHOWN,
  computeDashboardStats,
  statsWindowEnd,
  statsWindowStart,
} from './dashboard-stats'
import type { StatsTraining } from './dashboard-stats'
import { weekStart } from '#/shared/time/local-date'

/* Wednesday 2026-11-11, 12:00 in Warsaw (UTC+1). Week = Mon 11-09 – Sun 11-15. */
const NOW = new Date('2026-11-11T11:00:00Z')

const training = (
  iso: string,
  clientId: number | null,
  status: StatsTraining['status'] = 'confirmed',
): StatsTraining => ({ startsAt: new Date(iso), status, clientId })

const TRAININGS = [
  // this week
  training('2026-11-09T08:00:00Z', 1),
  training('2026-11-10T08:00:00Z', 2),
  training('2026-11-11T15:00:00Z', 3), // later today – planned
  training('2026-11-12T08:00:00Z', 1), // planned
  // last week
  training('2026-11-02T08:00:00Z', 1),
  training('2026-11-03T08:00:00Z', 2, 'cancelled'),
  training('2026-11-04T10:00:00Z', 2), // before "same moment" (Wed 11:00Z)
  training('2026-11-06T08:00:00Z', 3), // after it
  // October
  training('2026-10-05T08:00:00Z', 1), // previous 30-day window
  training('2026-10-20T08:00:00Z', 1),
]

describe('computeDashboardStats', () => {
  const stats = computeDashboardStats(TRAININGS, NOW)

  it('compares this week with last week up to the same moment', () => {
    expect(stats.week).toEqual({ current: 2, previous: 2, planned: 2 })
  })

  it('compares this month with the same days of last month', () => {
    // Nov so far: 02, 04, 06, 09, 10 (cancelled excluded); Oct 1–11: 05.
    expect(stats.month).toEqual({ current: 5, previous: 1, planned: 2 })
  })

  it('counts active clients and the cancellation rate over 30 days', () => {
    expect(stats.activeClients).toEqual({ current: 3, previous: 1 })
    expect(stats.cancellationRate.current).toBeCloseTo(1 / 7)
    expect(stats.cancellationRate.previous).toBe(0)
  })

  it('returns 12 weeks of done trainings, current week last', () => {
    expect(stats.weekly).toHaveLength(WEEKS_SHOWN)
    expect(stats.weekly[0].weekStart).toBe('2026-08-24')
    expect(stats.weekly.at(-1)).toEqual({
      weekStart: '2026-11-09',
      count: 2,
      current: true,
    })
    expect(stats.weekly.at(-2)).toMatchObject({ count: 3, current: false })
    const total = stats.weekly.reduce((n, w) => n + w.count, 0)
    expect(total).toBe(7) // every done training in the 12 weeks
  })

  it('ranks the most trained clients of the last 30 days', () => {
    expect(stats.topClients).toEqual([
      { clientId: 1, count: 3 },
      { clientId: 2, count: 2 },
      { clientId: 3, count: 1 },
    ])
  })

  it('handles no trainings', () => {
    const empty = computeDashboardStats([], NOW)
    expect(empty.cancellationRate).toEqual({ current: null, previous: null })
    expect(empty.weekly.every((w) => w.count === 0)).toBe(true)
  })

  it('loads a window covering every figure', () => {
    expect(statsWindowStart(NOW).toISOString()).toBe('2026-08-23T22:00:00.000Z')
    expect(statsWindowEnd(NOW).toISOString()).toBe('2026-11-30T23:00:00.000Z')
  })
})

describe('weekStart', () => {
  it.each([
    ['2026-11-09', '2026-11-09'], // Monday
    ['2026-11-11', '2026-11-09'],
    ['2026-11-15', '2026-11-09'], // Sunday
    ['2027-01-01', '2026-12-28'], // across years
  ])('%s -> %s', (date, expected) => {
    expect(weekStart(date)).toBe(expected)
  })
})
