/** Raw calendar of one trainer, as delivered by a source. */
export interface TrainerCalendar {
  /**
   * Google calendar id (file name without `.ics`). A personal calendar's id is
   * the trainer's email; a shared one (`…@group.calendar.google.com`) isn't,
   * so the trainer is then identified by the calendar name instead.
   */
  calendarId: string
  /** iCalendar (.ics) content. */
  ics: string
  /**
   * Earliest moment the feed is complete from. Omit for a full export (.ics
   * file); set it when the source only returns a window (e.g. Google API with
   * `timeMin`), so older trainings aren't treated as deleted.
   */
  coveredFrom?: Date
}

/**
 * Where trainer calendars come from. Today: .ics files (bundled with the app,
 * or a directory set via `CALENDARS_DIR`).
 * Later: Google Calendar API (export as iCal or map events to the same shape).
 * Bound to `TOKENS.CalendarSource`; swap the implementation in the module.
 */
export interface CalendarSource {
  fetchCalendars(): Promise<Array<TrainerCalendar>>
}
