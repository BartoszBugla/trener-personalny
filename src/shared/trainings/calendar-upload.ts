/** Limits and helpers for uploading .ics files (shared by client and server). */

export const CALENDAR_UPLOAD_MAX_FILES = 10
export const CALENDAR_UPLOAD_MAX_BYTES = 5 * 1024 * 1024
export const CALENDAR_UPLOAD_ACCEPT = '.ics,text/calendar'

/** FormData field names of the upload request (parallel lists). */
export const CALENDAR_UPLOAD_FIELDS = {
  files: 'files',
  calendarIds: 'calendarIds',
} as const

/**
 * Google Calendar exports name files after the calendar id
 * (`ola.trenerka@gmail.com.ics`), which is what imports key trainers and
 * events by – so the file name is the default calendar id.
 */
export function calendarIdFromFileName(fileName: string): string {
  return normalizeCalendarId(fileName.replace(/\.ics$/i, ''))
}

export function normalizeCalendarId(calendarId: string): string {
  return calendarId.trim().toLowerCase()
}

/** `|` separates the calendar id from the event id in `externalId`. */
export function isValidCalendarId(calendarId: string): boolean {
  return (
    calendarId.length > 0 &&
    calendarId.length <= 200 &&
    !calendarId.includes('|')
  )
}

export function isIcsFileName(fileName: string): boolean {
  return /\.ics$/i.test(fileName)
}
