import ICAL from 'ical.js'

/** One concrete occurrence of a calendar event (recurring series are expanded). */
export interface CalendarEvent {
  /** Stable per occurrence: UID, plus the original start for series occurrences. */
  occurrenceId: string
  summary: string
  description: string | null
  location: string | null
  /** Raw iCalendar STATUS (CONFIRMED / TENTATIVE / CANCELLED), upper-cased. */
  status: string | null
  startsAt: Date
  endsAt: Date
  isAllDay: boolean
}

export interface ParsedCalendar {
  /** X-WR-CALNAME, e.g. "Ola – treningi personalne". */
  name: string | null
  events: Array<CalendarEvent>
}

/** Safety net against runaway RRULEs (daily series with no end, etc.). */
const MAX_OCCURRENCES_PER_SERIES = 1000

/**
 * Parses an .ics file into flat event occurrences up to `until` (inclusive).
 * Handles RRULE expansion, EXDATE, and RECURRENCE-ID overrides (moved or
 * cancelled single occurrences of a series).
 */
export function parseIcsCalendar(
  ics: string,
  options: { until: Date },
): ParsedCalendar {
  const root = new ICAL.Component(ICAL.parse(ics))
  for (const tz of root.getAllSubcomponents('vtimezone')) {
    ICAL.TimezoneService.register(tz)
  }

  const vevents = root
    .getAllSubcomponents('vevent')
    .map((c) => new ICAL.Event(c))
  const masters = new Map<string, ICAL.Event>()
  const orphanExceptions: Array<ICAL.Event> = []

  for (const event of vevents) {
    if (!event.isRecurrenceException()) masters.set(event.uid, event)
  }
  for (const event of vevents) {
    if (!event.isRecurrenceException()) continue
    const master = masters.get(event.uid)
    if (master) master.relateException(event)
    else orphanExceptions.push(event)
  }

  const until = options.until.getTime()
  const events: Array<CalendarEvent> = []
  const push = (e: CalendarEvent) => {
    if (e.startsAt.getTime() <= until) events.push(e)
  }

  for (const master of masters.values()) {
    if (!master.isRecurring()) {
      push(
        toCalendarEvent(master, master.startDate, master.endDate, master.uid),
      )
      continue
    }
    const iterator = master.iterator()
    for (let i = 0; i < MAX_OCCURRENCES_PER_SERIES; i++) {
      const next = iterator.next()
      if (!next || next.toJSDate().getTime() > until) break
      const details = master.getOccurrenceDetails(next)
      const recurrenceId = details.recurrenceId.toJSDate().toISOString()
      push(
        toCalendarEvent(
          details.item,
          details.startDate,
          details.endDate,
          `${master.uid}#${recurrenceId}`,
        ),
      )
    }
  }

  for (const event of orphanExceptions) {
    const recurrenceId = event.recurrenceId.toJSDate().toISOString()
    push(
      toCalendarEvent(
        event,
        event.startDate,
        event.endDate,
        `${event.uid}#${recurrenceId}`,
      ),
    )
  }

  events.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
  return { name: stringProp(root, 'x-wr-calname'), events }
}

function toCalendarEvent(
  event: ICAL.Event,
  start: ICAL.Time,
  end: ICAL.Time | null,
  occurrenceId: string,
): CalendarEvent {
  const startsAt = start.toJSDate()
  return {
    occurrenceId,
    summary: event.summary?.trim() ?? '',
    description: event.description?.trim() || null,
    location: event.location?.trim() || null,
    status: stringProp(event.component, 'status')?.toUpperCase() ?? null,
    startsAt,
    endsAt: end ? end.toJSDate() : startsAt,
    isAllDay: start.isDate,
  }
}

function stringProp(component: ICAL.Component, name: string): string | null {
  const value = component.getFirstPropertyValue(name)
  return typeof value === 'string' && value.trim() ? value.trim() : null
}
