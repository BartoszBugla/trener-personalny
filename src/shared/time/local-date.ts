/**
 * Local-date helpers for the business time zone. Billing boundaries (plan
 * validity, months, package start) are local calendar days, not UTC.
 */
export const BUSINESS_TIME_ZONE = 'Europe/Warsaw'

const dateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: BUSINESS_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** Instant -> local `YYYY-MM-DD`. */
export function toLocalDate(instant: Date): string {
  return dateFormatter.format(instant)
}

const offsetFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: BUSINESS_TIME_ZONE,
  hourCycle: 'h23',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric',
})

/** Offset of the business zone from UTC at `instant`, in ms. */
function zoneOffset(instant: number): number {
  const parts = Object.fromEntries(
    offsetFormatter.formatToParts(instant).map((p) => [p.type, p.value]),
  )
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  )
  return asUtc - Math.floor(instant / 1000) * 1000
}

/** Local `YYYY-MM-DD` -> instant of local midnight that day. */
export function startOfLocalDay(date: string): Date {
  const [y, m, d] = date.split('-').map(Number)
  const guess = Date.UTC(y, m - 1, d)
  const first = guess - zoneOffset(guess)
  // Re-check: the offset may differ at the corrected instant (DST change).
  return new Date(guess - zoneOffset(first))
}

/** First day of the month containing `date` (`YYYY-MM-DD`), as `YYYY-MM-01`. */
export function monthStart(date: string): string {
  return `${date.slice(0, 7)}-01`
}

/** `YYYY-MM-01` of the following month. */
export function nextMonthStart(date: string): string {
  const [y, m] = date.split('-').map(Number)
  return m === 12
    ? `${y + 1}-01-01`
    : `${y}-${String(m + 1).padStart(2, '0')}-01`
}

/** `YYYY-MM-DD` shifted by `days` calendar days. */
export function addLocalDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}

/** Monday of the week containing `date` (`YYYY-MM-DD`, ISO weeks). */
export function weekStart(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay() // 0 = Sunday
  return addLocalDays(date, -((weekday + 6) % 7))
}
