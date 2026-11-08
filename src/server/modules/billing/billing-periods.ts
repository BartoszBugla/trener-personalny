import {
  monthStart,
  nextMonthStart,
  startOfLocalDay,
  toLocalDate,
} from '../../core/time/local-date'

/**
 * Pure billing calculations – no DB access. Inputs are already filtered to the
 * relevant client(s), plan validity and attended (confirmed) trainings.
 */

export interface FrozenPeriod {
  startsAt: Date
  endsAt: Date
  trainingCount: number
  smsSentAt: Date
}

export interface ComputedPeriod {
  startsAt: Date
  endsAt: Date
  trainingCount: number
  targetCount: number | null
  complete: boolean
  smsSentAt: Date | null
}

/**
 * "Every N trainings": a period starts with a training and closes on the N-th
 * one; the next period starts with the following training.
 *
 * Periods already closed by sending the SMS (`frozen`) keep their stored
 * boundaries; the remaining trainings are grouped live. Result is chronological;
 * the last period is usually the current, incomplete one.
 */
export function computeTrainingPeriods(
  trainingTimes: Array<Date>,
  size: number,
  frozen: Array<FrozenPeriod>,
): Array<ComputedPeriod> {
  const frozenSorted = [...frozen].sort(byStart)
  const isInFrozen = (t: Date) =>
    frozenSorted.some(
      (f) =>
        t.getTime() >= f.startsAt.getTime() &&
        t.getTime() <= f.endsAt.getTime(),
    )

  type Item =
    | { kind: 'training'; at: Date }
    | { kind: 'frozen'; at: Date; period: FrozenPeriod }
  const items: Array<Item> = [
    ...trainingTimes
      .filter((t) => !isInFrozen(t))
      .map((at): Item => ({ kind: 'training', at })),
    ...frozenSorted.map((period): Item => ({
      kind: 'frozen',
      at: period.startsAt,
      period,
    })),
  ].sort((a, b) => a.at.getTime() - b.at.getTime())

  const result: Array<ComputedPeriod> = []
  let chunk: Array<Date> = []
  const flush = () => {
    if (chunk.length === 0) return
    result.push({
      startsAt: chunk[0],
      endsAt: chunk[chunk.length - 1],
      trainingCount: chunk.length,
      targetCount: size,
      complete: chunk.length === size,
      smsSentAt: null,
    })
    chunk = []
  }

  for (const item of items) {
    if (item.kind === 'frozen') {
      flush()
      result.push({ ...item.period, targetCount: size, complete: true })
    } else {
      chunk.push(item.at)
      if (chunk.length === size) flush()
    }
  }
  flush()
  return result
}

/**
 * Calendar months (local time) from the month of `validFrom` up to the month
 * containing `now` (or the last month before `validTo`). A month is complete
 * once it has ended.
 */
export function computeMonthlyPeriods(
  trainingTimes: Array<Date>,
  validity: { validFrom: string; validTo: string | null },
  now: Date,
  frozen: Array<FrozenPeriod>,
): Array<ComputedPeriod> {
  const today = toLocalDate(now)
  const lastDay =
    validity.validTo && validity.validTo <= today
      ? toLocalDate(new Date(startOfLocalDay(validity.validTo).getTime() - 1))
      : today
  const result: Array<ComputedPeriod> = []

  for (
    let month = monthStart(validity.validFrom);
    month <= lastDay;
    month = nextMonthStart(month)
  ) {
    const start = startOfLocalDay(month)
    const next = startOfLocalDay(nextMonthStart(month))
    const stored = frozen.find((f) => f.startsAt.getTime() === start.getTime())
    result.push({
      startsAt: start,
      endsAt: new Date(next.getTime() - 1000),
      trainingCount: trainingTimes.filter(
        (t) => t.getTime() >= start.getTime() && t.getTime() < next.getTime(),
      ).length,
      targetCount: null,
      complete: now.getTime() >= next.getTime(),
      smsSentAt: stored?.smsSentAt ?? null,
    })
  }
  return result
}

export interface PackageInput {
  id: number
  size: number
  startsOn: string
}

export interface PackageUsage {
  id: number
  used: number
  firstTrainingAt: Date | null
  lastTrainingAt: Date | null
  complete: boolean
}

/**
 * Family packages: members' trainings consume packages in order (oldest
 * first). A training dated before the next open package starts, or after all
 * packages are used up, is "uncovered" – a new package is needed.
 */
export function computePackageUsage(
  packages: Array<PackageInput>,
  trainingTimes: Array<Date>,
): { packages: Array<PackageUsage>; uncovered: number } {
  const ordered = [...packages].sort(
    (a, b) => a.startsOn.localeCompare(b.startsOn) || a.id - b.id,
  )
  const usage = ordered.map((p): PackageUsage => ({
    id: p.id,
    used: 0,
    firstTrainingAt: null,
    lastTrainingAt: null,
    complete: false,
  }))
  let current = 0
  let uncovered = 0

  for (const at of [...trainingTimes].sort(
    (a, b) => a.getTime() - b.getTime(),
  )) {
    while (
      current < ordered.length &&
      usage[current].used >= ordered[current].size
    ) {
      current++
    }
    if (
      current >= ordered.length ||
      ordered[current].startsOn > toLocalDate(at)
    ) {
      uncovered++
      continue
    }
    const u = usage[current]
    u.used++
    u.firstTrainingAt ??= at
    u.lastTrainingAt = at
    u.complete = u.used === ordered[current].size
  }

  return { packages: usage, uncovered }
}

/** Is a training (instant) inside a plan's local-date validity window? */
export function isWithinValidity(
  at: Date,
  validity: { validFrom: string; validTo: string | null },
): boolean {
  const day = toLocalDate(at)
  return (
    day >= validity.validFrom && (!validity.validTo || day < validity.validTo)
  )
}

function byStart(a: { startsAt: Date }, b: { startsAt: Date }) {
  return a.startsAt.getTime() - b.startsAt.getTime()
}
