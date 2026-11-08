import { describe, expect, it } from 'vitest'

import kamilIcs from './calendars/kamil.trener@gmail.com.ics?raw'
import { parseIcsCalendar } from './ics-parser'

const UNTIL = new Date('2026-12-08T23:59:59Z')

const ics = (events: string) => `BEGIN:VCALENDAR
VERSION:2.0
X-WR-CALNAME:Test
BEGIN:VTIMEZONE
TZID:Europe/Warsaw
BEGIN:DAYLIGHT
TZOFFSETFROM:+0100
TZOFFSETTO:+0200
DTSTART:19700329T020000
RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU
END:DAYLIGHT
BEGIN:STANDARD
TZOFFSETFROM:+0200
TZOFFSETTO:+0100
DTSTART:19701025T030000
RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU
END:STANDARD
END:VTIMEZONE
${events}
END:VCALENDAR`

describe('parseIcsCalendar', () => {
  it('reads calendar name and single events', () => {
    const parsed = parseIcsCalendar(
      ics(`BEGIN:VEVENT
UID:one
DTSTART:20260901T050000Z
DTEND:20260901T060000Z
SUMMARY:Piotr Zielinski
DESCRIPTION:Zaliczka 600 zł\\, pakiet 12
LOCATION:Siłownia
STATUS:CONFIRMED
END:VEVENT`),
      { until: UNTIL },
    )
    expect(parsed.name).toBe('Test')
    expect(parsed.events).toEqual([
      {
        occurrenceId: 'one',
        summary: 'Piotr Zielinski',
        description: 'Zaliczka 600 zł, pakiet 12',
        location: 'Siłownia',
        status: 'CONFIRMED',
        startsAt: new Date('2026-09-01T05:00:00Z'),
        endsAt: new Date('2026-09-01T06:00:00Z'),
        isAllDay: false,
      },
    ])
  })

  it('converts TZID times to UTC across the DST change', () => {
    const parsed = parseIcsCalendar(
      ics(`BEGIN:VEVENT
UID:series
DTSTART;TZID=Europe/Warsaw:20261021T180000
DTEND;TZID=Europe/Warsaw:20261021T190000
RRULE:FREQ=WEEKLY;COUNT=2
SUMMARY:Kasia
END:VEVENT`),
      { until: UNTIL },
    )
    expect(parsed.events.map((e) => e.startsAt.toISOString())).toEqual([
      '2026-10-21T16:00:00.000Z', // CEST (+2)
      '2026-10-28T17:00:00.000Z', // CET (+1)
    ])
  })

  it('stops open-ended series at the horizon', () => {
    const parsed = parseIcsCalendar(
      ics(`BEGIN:VEVENT
UID:forever
DTSTART:20261101T100000Z
DTEND:20261101T110000Z
RRULE:FREQ=DAILY
SUMMARY:Daily
END:VEVENT`),
      { until: new Date('2026-11-05T12:00:00Z') },
    )
    expect(parsed.events).toHaveLength(5)
  })

  it('flags all-day events', () => {
    const parsed = parseIcsCalendar(
      ics(`BEGIN:VEVENT
UID:holiday
DTSTART;VALUE=DATE:20261012
DTEND;VALUE=DATE:20261013
SUMMARY:Urlop
END:VEVENT`),
      { until: UNTIL },
    )
    expect(parsed.events[0].isAllDay).toBe(true)
  })

  describe("Kamil's calendar (real export)", () => {
    const parsed = parseIcsCalendar(kamilIcs, { until: UNTIL })
    const annaSeries = parsed.events.filter((e) =>
      e.occurrenceId.startsWith('anna-nowak-seria@google.com#'),
    )

    it('expands the Mon/Thu series, honouring EXDATE', () => {
      const starts = annaSeries.map((e) => e.startsAt.toISOString())
      expect(starts[0]).toBe('2026-09-03T15:00:00.000Z')
      // EXDATE 2026-10-19 17:00 Warsaw – moved to a standalone "Ania" event
      expect(starts).not.toContain('2026-10-19T15:00:00.000Z')
      // Last occurrence within the horizon (Mon 2026-12-07 17:00 CET)
      expect(starts.at(-1)).toBe('2026-12-07T16:00:00.000Z')
      // Every Mon & Thu from 2026-09-03 to 2026-12-07 = 28, minus 1 EXDATE
      expect(annaSeries).toHaveLength(27)
    })

    it('applies the RECURRENCE-ID override (cancelled occurrence)', () => {
      const overridden = annaSeries.find(
        (e) => e.startsAt.toISOString() === '2026-11-12T16:00:00.000Z',
      )
      expect(overridden?.status).toBe('CANCELLED')
      expect(annaSeries.filter((e) => e.status === 'CANCELLED')).toHaveLength(1)
    })
  })
})
