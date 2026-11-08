import { describe, expect, it } from 'vitest'

import {
  computeMonthlyPeriods,
  computePackageUsage,
  computeTrainingPeriods,
  isWithinValidity,
} from './billing-periods'
import { startOfLocalDay, toLocalDate } from '../../core/time/local-date'

const d = (iso: string) => new Date(iso)
const iso = (date: Date) => date.toISOString()

describe('local dates (Europe/Warsaw)', () => {
  it('maps local midnight to UTC across DST changes', () => {
    expect(iso(startOfLocalDay('2026-10-25'))).toBe('2026-10-24T22:00:00.000Z')
    expect(iso(startOfLocalDay('2026-10-26'))).toBe('2026-10-25T23:00:00.000Z')
    expect(iso(startOfLocalDay('2026-03-29'))).toBe('2026-03-28T23:00:00.000Z')
    expect(iso(startOfLocalDay('2026-03-30'))).toBe('2026-03-29T22:00:00.000Z')
  })

  it('formats instants as local dates', () => {
    expect(toLocalDate(d('2026-10-24T22:30:00Z'))).toBe('2026-10-25')
    expect(toLocalDate(d('2026-10-24T21:59:59Z'))).toBe('2026-10-24')
  })

  it('checks plan validity with an exclusive end date', () => {
    const plan = { validFrom: '2026-05-01', validTo: '2026-06-01' }
    expect(isWithinValidity(d('2026-04-30T21:59:59Z'), plan)).toBe(false)
    expect(isWithinValidity(d('2026-04-30T22:00:00Z'), plan)).toBe(true)
    expect(isWithinValidity(d('2026-05-31T21:59:59Z'), plan)).toBe(true)
    expect(isWithinValidity(d('2026-05-31T22:00:00Z'), plan)).toBe(false)
  })
})

describe('computeTrainingPeriods (every N trainings)', () => {
  const may = [
    '2026-05-05T08:00:00Z',
    '2026-05-08T08:00:00Z',
    '2026-05-15T08:00:00Z',
    '2026-05-20T08:00:00Z',
    '2026-05-22T08:00:00Z',
  ].map(d)

  it('closes a period on the N-th training and starts the next one after it', () => {
    const periods = computeTrainingPeriods(may, 4, [])
    expect(
      periods.map((p) => [
        iso(p.startsAt),
        iso(p.endsAt),
        p.trainingCount,
        p.complete,
      ]),
    ).toEqual([
      ['2026-05-05T08:00:00.000Z', '2026-05-20T08:00:00.000Z', 4, true],
      ['2026-05-22T08:00:00.000Z', '2026-05-22T08:00:00.000Z', 1, false],
    ])
  })

  it('keeps frozen (SMS sent) periods stable when trainings change later', () => {
    const frozen = [
      {
        startsAt: may[0],
        endsAt: may[3],
        trainingCount: 4,
        smsSentAt: d('2026-05-21T10:00:00Z'),
      },
    ]
    // The 8 May training was later removed from the calendar.
    const after = may.filter((t) => t !== may[1])
    const periods = computeTrainingPeriods(after, 4, frozen)
    expect(periods[0]).toMatchObject({
      trainingCount: 4,
      complete: true,
      smsSentAt: frozen[0].smsSentAt,
    })
    expect(iso(periods[1].startsAt)).toBe('2026-05-22T08:00:00.000Z')
  })

  it('does not let a live period span across a frozen one', () => {
    const times = ['01', '02', '03', '04', '05', '06'].map((day) =>
      d(`2026-06-${day}T08:00:00Z`),
    )
    const frozen = [
      {
        startsAt: times[2],
        endsAt: times[3],
        trainingCount: 2,
        smsSentAt: d('2026-06-10T00:00:00Z'),
      },
    ]
    const periods = computeTrainingPeriods(times, 4, frozen)
    expect(
      periods.map((p) => [p.trainingCount, p.complete, p.smsSentAt !== null]),
    ).toEqual([
      [2, false, false],
      [2, true, true],
      [2, false, false],
    ])
  })

  it('returns nothing without trainings', () => {
    expect(computeTrainingPeriods([], 8, [])).toEqual([])
  })
})

describe('computeMonthlyPeriods', () => {
  const trainings = [
    '2026-09-30T22:30:00Z', // 00:30 on 1 Oct local (CEST)
    '2026-10-15T08:00:00Z',
    '2026-11-03T08:00:00Z',
  ].map(d)

  it('lists months up to the current one, local-time boundaries', () => {
    const periods = computeMonthlyPeriods(
      trainings,
      { validFrom: '2026-09-15', validTo: null },
      d('2026-11-08T12:00:00Z'),
      [],
    )
    expect(
      periods.map((p) => [
        toLocalDate(p.startsAt),
        p.trainingCount,
        p.complete,
      ]),
    ).toEqual([
      ['2026-09-01', 0, true],
      ['2026-10-01', 2, true],
      ['2026-11-01', 1, false],
    ])
    expect(iso(periods[1].endsAt)).toBe('2026-10-31T22:59:59.000Z')
  })

  it('stops at the end of a closed plan and reads SMS state', () => {
    const smsSentAt = d('2026-11-01T09:00:00Z')
    const periods = computeMonthlyPeriods(
      trainings,
      { validFrom: '2026-10-01', validTo: '2026-11-01' },
      d('2026-12-20T12:00:00Z'),
      [
        {
          startsAt: startOfLocalDay('2026-10-01'),
          endsAt: d('2026-10-31T22:59:59Z'),
          trainingCount: 2,
          smsSentAt,
        },
      ],
    )
    expect(periods).toHaveLength(1)
    expect(periods[0].smsSentAt).toEqual(smsSentAt)
  })
})

describe('computePackageUsage (family packages)', () => {
  const times = Array.from({ length: 17 }, (_, i) =>
    d(`2026-09-${String(i + 1).padStart(2, '0')}T08:00:00Z`),
  )

  it('consumes packages in order and reports uncovered trainings', () => {
    const { packages, uncovered } = computePackageUsage(
      [
        { id: 2, size: 5, startsOn: '2026-09-05' },
        { id: 1, size: 10, startsOn: '2026-09-01' },
      ],
      times,
    )
    expect(packages).toMatchObject([
      { id: 1, used: 10, complete: true },
      { id: 2, used: 5, complete: true },
    ])
    expect(iso(packages[1].firstTrainingAt!)).toBe('2026-09-11T08:00:00.000Z')
    expect(uncovered).toBe(2)
  })

  it('does not count trainings before the package starts', () => {
    const { packages, uncovered } = computePackageUsage(
      [{ id: 1, size: 10, startsOn: '2026-09-10' }],
      times,
    )
    expect(packages[0].used).toBe(8)
    expect(uncovered).toBe(9)
  })
})
