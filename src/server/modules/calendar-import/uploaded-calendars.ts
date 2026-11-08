import ICAL from 'ical.js'

import { BadRequestException } from '../../core/errors/http-exceptions'
import type { TrainerCalendar } from './calendar-source'
import {
  CALENDAR_UPLOAD_FIELDS,
  CALENDAR_UPLOAD_MAX_BYTES,
  CALENDAR_UPLOAD_MAX_FILES,
  calendarIdFromFileName,
  isIcsFileName,
  isValidCalendarId,
  normalizeCalendarId,
} from '#/shared/trainings/calendar-upload'

/**
 * Turns an upload request (`files` + optional parallel `calendarIds`) into
 * calendars for `CalendarImportService.importCalendars`. Everything is
 * validated up front, so a bad file rejects the whole upload before anything
 * is written.
 */
export async function readUploadedCalendars(
  formData: FormData,
): Promise<Array<TrainerCalendar>> {
  const files = formData
    .getAll(CALENDAR_UPLOAD_FIELDS.files)
    .filter((f): f is File => f instanceof File)
  const calendarIds = formData.getAll(CALENDAR_UPLOAD_FIELDS.calendarIds)

  if (files.length === 0) {
    throw new BadRequestException({ key: 'noCalendarFiles' })
  }
  if (files.length > CALENDAR_UPLOAD_MAX_FILES) {
    throw new BadRequestException({
      key: 'tooManyCalendarFiles',
      params: { max: CALENDAR_UPLOAD_MAX_FILES },
    })
  }

  const calendars = await Promise.all(
    files.map(async (file, i) => {
      const requested = calendarIds[i]
      const calendarId =
        typeof requested === 'string' && requested.trim()
          ? normalizeCalendarId(requested)
          : calendarIdFromFileName(file.name)

      if (!isIcsFileName(file.name)) {
        throw new BadRequestException({
          key: 'invalidCalendarFile',
          params: { file: file.name },
        })
      }
      if (file.size > CALENDAR_UPLOAD_MAX_BYTES) {
        throw new BadRequestException({
          key: 'calendarFileTooLarge',
          params: {
            file: file.name,
            maxMb: CALENDAR_UPLOAD_MAX_BYTES / 1024 / 1024,
          },
        })
      }
      if (!isValidCalendarId(calendarId)) {
        throw new BadRequestException({
          key: 'invalidCalendarId',
          params: { file: file.name },
        })
      }

      const ics = await file.text()
      if (!isICalendar(ics)) {
        throw new BadRequestException({
          key: 'invalidCalendarFile',
          params: { file: file.name },
        })
      }
      return { calendarId, ics }
    }),
  )

  const ids = calendars.map((c) => c.calendarId)
  const duplicate = ids.find((id, i) => ids.indexOf(id) !== i)
  if (duplicate) {
    throw new BadRequestException({
      key: 'duplicateCalendarId',
      params: { calendarId: duplicate },
    })
  }
  return calendars
}

function isICalendar(ics: string): boolean {
  try {
    // jCal: a single component is `[name, properties, subcomponents]`;
    // several concatenated calendars parse to an array of them – rejected.
    const parsed: unknown = ICAL.parse(ics)
    return Array.isArray(parsed) && parsed[0] === 'vcalendar'
  } catch {
    return false
  }
}
