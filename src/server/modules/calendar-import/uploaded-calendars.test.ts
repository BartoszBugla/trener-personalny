import { describe, expect, it } from 'vitest'

import { readUploadedCalendars } from './uploaded-calendars'
import {
  CALENDAR_UPLOAD_MAX_BYTES,
  CALENDAR_UPLOAD_MAX_FILES,
} from '#/shared/trainings/calendar-upload'

const ICS = `BEGIN:VCALENDAR
VERSION:2.0
X-WR-CALNAME:Kamil
BEGIN:VEVENT
UID:e-1
DTSTART:20261104T080000Z
DTEND:20261104T090000Z
SUMMARY:Anna Nowak
END:VEVENT
END:VCALENDAR`

const icsFile = (name: string, content = ICS) =>
  new File([content], name, { type: 'text/calendar' })

const form = (files: Array<File>, calendarIds?: Array<string>) => {
  const data = new FormData()
  for (const f of files) data.append('files', f)
  for (const id of calendarIds ?? []) data.append('calendarIds', id)
  return data
}

const errorKey = (promise: Promise<unknown>) =>
  promise.then(
    () => null,
    (e: { i18n?: { key: string } }) => e.i18n?.key,
  )

describe('readUploadedCalendars', () => {
  it('derives the calendar id from the file name', async () => {
    const calendars = await readUploadedCalendars(
      form([icsFile('Kamil.Trener@Gmail.com.ics')]),
    )
    expect(calendars).toEqual([
      { calendarId: 'kamil.trener@gmail.com', ics: ICS },
    ])
  })

  it('prefers a given calendar id', async () => {
    const calendars = await readUploadedCalendars(
      form([icsFile('basic.ics')], [' Kamil@Example.com ']),
    )
    expect(calendars[0].calendarId).toBe('kamil@example.com')
  })

  it('rejects an empty upload', async () => {
    expect(await errorKey(readUploadedCalendars(form([])))).toBe(
      'noCalendarFiles',
    )
  })

  it('rejects too many files', async () => {
    const files = Array.from(
      { length: CALENDAR_UPLOAD_MAX_FILES + 1 },
      (_, i) => icsFile(`c${i}@example.com.ics`),
    )
    expect(await errorKey(readUploadedCalendars(form(files)))).toBe(
      'tooManyCalendarFiles',
    )
  })

  it('rejects non-.ics files and invalid content', async () => {
    expect(
      await errorKey(readUploadedCalendars(form([icsFile('a@b.c.txt')]))),
    ).toBe('invalidCalendarFile')
    expect(
      await errorKey(
        readUploadedCalendars(form([icsFile('a@b.c.ics', 'not a calendar')])),
      ),
    ).toBe('invalidCalendarFile')
    expect(
      await errorKey(
        readUploadedCalendars(
          form([icsFile('a@b.c.ics', 'BEGIN:VCARD\nVERSION:3.0\nEND:VCARD')]),
        ),
      ),
    ).toBe('invalidCalendarFile')
  })

  it('rejects files over the size limit', async () => {
    const big = icsFile('a@b.c.ics', 'x'.repeat(CALENDAR_UPLOAD_MAX_BYTES + 1))
    expect(await errorKey(readUploadedCalendars(form([big])))).toBe(
      'calendarFileTooLarge',
    )
  })

  it('rejects invalid and duplicate calendar ids', async () => {
    expect(
      await errorKey(
        readUploadedCalendars(form([icsFile('a.ics')], ['bad|id'])),
      ),
    ).toBe('invalidCalendarId')
    expect(
      await errorKey(
        readUploadedCalendars(
          form([icsFile('a.ics'), icsFile('b.ics')], ['x@y.z', 'X@Y.Z']),
        ),
      ),
    ).toBe('duplicateCalendarId')
  })
})
