import { inject, injectable } from 'inversify'

import { TOKENS } from '../../core/di/tokens'
import { LoggerService } from '../../core/logger/logger.service'
import { TrainingsRepository } from '../trainings/trainings.repository'
import type { NewTrainingRow } from '../trainings/trainings.table'
import { UsersService } from '../users/users.service'
import type { CalendarSource, TrainerCalendar } from './calendar-source'
import { classifyEvent, extractClientName } from './event-classifier'
import type { EventClassification } from './event-classifier'
import { parseIcsCalendar } from './ics-parser'
import type { ImportSummary } from '#/shared/trainings/trainings.dto'
import { normalizeName } from '#/shared/users/normalize-name'

/**
 * A new client is created automatically only if their name appears at least
 * this many times in the calendar. One-off titles are often notes/errands
 * ("Koszenie Trawy"), so they go to manual assignment instead.
 */
const MIN_OCCURRENCES_TO_CREATE_CLIENT = 2

export interface ImportOptions {
  /** Reference "today"; trainings later than one month after it are ignored. */
  now?: Date
}

/* Events are processed sequentially on purpose: resolving one may create a
   client that the next event must match, so they can't run in parallel. */
/* oxlint-disable no-await-in-loop */

/**
 * Pulls trainer calendars from the configured `CalendarSource` and upserts
 * trainings. Idempotent: occurrences are keyed by (calendar, UID, recurrence id),
 * so re-running updates rows instead of duplicating them. Manually assigned
 * clients are never overwritten.
 *
 * Reconciliation: trainings previously imported from a calendar that are no
 * longer in it (event deleted, series moved to another time, turned into a
 * non-training) get status `removed` – kept for history, hidden in the UI.
 * If such an event comes back, the next import restores its status.
 */
@injectable()
export class CalendarImportService {
  constructor(
    @inject(TOKENS.CalendarSource) private readonly source: CalendarSource,
    @inject(UsersService) private readonly users: UsersService,
    @inject(TrainingsRepository)
    private readonly trainings: TrainingsRepository,
    @inject(LoggerService) private readonly logger: LoggerService,
  ) {}

  /** Imports every calendar of the configured source. */
  async importAll(options: ImportOptions = {}): Promise<ImportSummary> {
    return this.importCalendars(await this.source.fetchCalendars(), options)
  }

  /**
   * Imports the given calendars (e.g. .ics files uploaded by the user). Same
   * rules as `importAll`; each calendar is treated as a full export, so its
   * trainings missing from the file are marked `removed`.
   */
  async importCalendars(
    calendars: Array<TrainerCalendar>,
    options: ImportOptions = {},
  ): Promise<ImportSummary> {
    const until = addMonths(options.now ?? new Date(), 1)
    const summary: ImportSummary = {
      calendars: calendars.length,
      created: 0,
      updated: 0,
      skipped: 0,
      cancelled: 0,
      ignored: 0,
      removed: 0,
      unassigned: 0,
      trainersCreated: 0,
      clientsCreated: 0,
    }

    for (const calendar of calendars) {
      await this.importCalendar(calendar, until, summary)
    }

    this.logger.info('Calendar import finished', { ...summary })
    return summary
  }

  private async importCalendar(
    calendar: TrainerCalendar,
    until: Date,
    summary: ImportSummary,
  ): Promise<void> {
    const parsed = parseIcsCalendar(calendar.ics, { until })
    const { user: trainer, created } = await this.ensureTrainer(
      calendar,
      parsed.name,
    )
    if (created) summary.trainersCreated++

    const classified = parsed.events.map((event) => ({
      event,
      classification: classifyEvent(event),
    }))
    const nameCounts = countClientNames(classified.map((c) => c.classification))
    const ignoredTitles = await this.trainings.findIgnoredTitles()

    const seen = new Set<string>()
    for (const { event, classification } of classified) {
      if (classification.kind === 'skip') {
        summary.skipped++
        continue
      }

      const externalId = externalIdOf(calendar, event.occurrenceId)
      seen.add(externalId)
      const existing = await this.trainings.findByExternalId('ics', externalId)

      // Marked "not a training" (this event or its title): keep it ignored.
      const ignored =
        existing?.status === 'ignored' ||
        ignoredTitles.has(normalizeName(event.summary))

      let clientId: number | null
      if (ignored) {
        clientId = existing?.clientId ?? null
      } else if (existing?.clientAssignedManually) {
        clientId = existing.clientId
      } else {
        const match = await this.users.resolveClient(
          classification.clientName,
          {
            excludeUserId: trainer.id,
            allowCreate:
              (nameCounts.get(normalizeName(classification.clientName ?? '')) ??
                0) >= MIN_OCCURRENCES_TO_CREATE_CLIENT,
          },
        )
        if (match.status === 'created') summary.clientsCreated++
        clientId = match.status === 'unresolved' ? null : match.user.id
      }

      const data: NewTrainingRow = {
        trainerId: trainer.id,
        clientId,
        startsAt: event.startsAt,
        endsAt: event.endsAt,
        status: ignored ? 'ignored' : classification.status,
        title: event.summary,
        clientName: classification.clientName,
        location: event.location,
        notes: event.description,
        source: 'ics',
        externalId,
      }
      if (existing) {
        await this.trainings.update(existing.id, data)
        summary.updated++
      } else {
        await this.trainings.create(data)
        summary.created++
      }
      if (ignored) {
        summary.ignored++
        continue
      }
      if (classification.status === 'cancelled') summary.cancelled++
      if (clientId === null) summary.unassigned++
    }

    summary.removed += await this.markMissingAsRemoved(
      calendar,
      trainer.id,
      seen,
      until,
    )
  }

  /**
   * A personal calendar's id is the trainer's email. A shared calendar
   * ("Kacper Kopeć - Praca", id `…@group.calendar.google.com`) is matched by
   * the name before " - ".
   */
  private ensureTrainer(
    calendar: TrainerCalendar,
    calendarName: string | null,
  ) {
    const name = calendarName ? extractClientName(calendarName) : null
    if (isPersonalCalendar(calendar.calendarId)) {
      return this.users.ensureTrainer(
        calendar.calendarId,
        name ?? calendar.calendarId.split('@')[0],
      )
    }
    return this.users.ensureTrainerByName(name ?? calendar.calendarId)
  }

  /**
   * Flags trainings of this calendar that the source no longer contains.
   * Only the period the source actually covered is checked: up to the import
   * horizon, and from `calendar.coveredFrom` if the source is windowed.
   */
  private async markMissingAsRemoved(
    calendar: TrainerCalendar,
    trainerId: number,
    seen: Set<string>,
    until: Date,
  ): Promise<number> {
    const prefix = externalIdOf(calendar, '')
    const candidates = await this.trainings.findActiveForReconciliation({
      source: 'ics',
      trainerId,
      from: calendar.coveredFrom,
      until,
    })
    const missing = candidates.filter(
      (t) => t.externalId.startsWith(prefix) && !seen.has(t.externalId),
    )
    for (const t of missing) {
      await this.trainings.update(t.id, { status: 'removed' })
    }
    if (missing.length > 0) {
      this.logger.info('Trainings removed from calendar', {
        calendar: calendar.calendarId,
        ids: missing.map((t) => t.id),
      })
    }
    return missing.length
  }
}

function countClientNames(
  classifications: Array<EventClassification>,
): Map<string, number> {
  const counts = new Map<string, number>()
  for (const c of classifications) {
    if (c.kind !== 'training' || !c.clientName) continue
    const key = normalizeName(c.clientName)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return counts
}

/** The calendar id scopes event UIDs. */
function externalIdOf(calendar: TrainerCalendar, occurrenceId: string) {
  return `${calendar.calendarId}|${occurrenceId}`
}

/** Personal Google calendars are identified by the owner's email. */
function isPersonalCalendar(calendarId: string): boolean {
  return calendarId.includes('@') && !calendarId.endsWith('calendar.google.com')
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date)
  result.setMonth(result.getMonth() + months)
  return result
}
