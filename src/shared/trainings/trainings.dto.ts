import { z } from 'zod'

import {
  pageSchema,
  pageSizeSchema,
  searchTextSchema,
  sortDirectionSchema,
} from '../list-query'
import type { Page } from '../list-query'

export const assignClientSchema = z.object({
  trainingId: z.coerce.number().int().positive(),
  clientId: z.coerce.number().int().positive(),
  /**
   * Also assign every other unassigned training with the same client name and
   * remember the name as an alias, so future imports match automatically.
   */
  applyToSameName: z.boolean().default(true),
})
export type AssignClientDto = z.input<typeof assignClientSchema>

/**
 * Which statuses to list: `active` = the schedule (confirmed + cancelled),
 * `all` also includes `removed` and `ignored`.
 */
export const TRAINING_STATUS_FILTERS = [
  'active',
  'confirmed',
  'cancelled',
  'removed',
  'ignored',
  'all',
] as const
export type TrainingStatusFilter = (typeof TRAINING_STATUS_FILTERS)[number]

/** Sortable columns of the trainings table. */
export const TRAINING_SORT_FIELDS = [
  'date',
  'time',
  'trainer',
  'client',
  'status',
  'notes',
] as const
export type TrainingSortField = (typeof TRAINING_SORT_FIELDS)[number]

const localDate = z.iso.date()

/** Filters + pagination of the trainings list (also the route's search params). */
export const listTrainingsSchema = z.object({
  page: pageSchema,
  pageSize: pageSizeSchema,
  /** Matches client name, calendar title and notes (ignores case/diacritics). */
  q: searchTextSchema,
  trainerId: z.coerce.number().int().positive().optional().catch(undefined),
  status: z.enum(TRAINING_STATUS_FILTERS).default('active').catch('active'),
  /** Only trainings without a client. */
  unassigned: z.boolean().optional().catch(undefined),
  /** Local dates (Europe/Warsaw), both inclusive. */
  from: localDate.optional().catch(undefined),
  to: localDate.optional().catch(undefined),
  sortBy: z.enum(TRAINING_SORT_FIELDS).default('date').catch('date'),
  sort: sortDirectionSchema('desc'),
})
export type ListTrainingsQuery = z.output<typeof listTrainingsSchema>
export type ListTrainingsSearch = z.input<typeof listTrainingsSchema>

/** Longest range the calendar may request (a month view spans ≤ 6 weeks). */
export const CALENDAR_MAX_RANGE_DAYS = 45

/** Calendar views (FullCalendar view names) – also the route's search param. */
export const CALENDAR_VIEWS = [
  'dayGridMonth',
  'timeGridWeek',
  'timeGridDay',
  'listWeek',
] as const
export type CalendarView = (typeof CALENDAR_VIEWS)[number]

/** Trainings starting in [from, to) – what the calendar shows. */
export const trainingsRangeSchema = z
  .object({
    from: z.iso.datetime({ offset: true }),
    to: z.iso.datetime({ offset: true }),
    trainerId: z.coerce.number().int().positive().optional(),
    /** Also return `removed` and `ignored` events. */
    includeHidden: z.boolean().default(false),
  })
  .refine(
    ({ from, to }) => {
      const days = (Date.parse(to) - Date.parse(from)) / 86_400_000
      return days > 0 && days <= CALENDAR_MAX_RANGE_DAYS
    },
    {
      message: `Range must be 1–${CALENDAR_MAX_RANGE_DAYS} days`,
      path: ['to'],
    },
  )
export type TrainingsRangeQuery = z.input<typeof trainingsRangeSchema>

/** Calendar page search params (garbage in the URL falls back to defaults). */
export const trainingsCalendarSearchSchema = z.object({
  view: z.enum(CALENDAR_VIEWS).default('dayGridMonth').catch('dayGridMonth'),
  /** Local date the view shows (default: today). */
  date: localDate.optional().catch(undefined),
  trainerId: z.coerce.number().int().positive().optional().catch(undefined),
  includeHidden: z.boolean().optional().catch(undefined),
})
export type TrainingsCalendarSearch = z.output<
  typeof trainingsCalendarSearchSchema
>

export const ignoreTrainingSchema = z.object({
  trainingId: z.coerce.number().int().positive(),
  /**
   * Also ignore every other event with the same title and remember the title,
   * so future imports ignore it too.
   */
  applyToSameTitle: z.boolean().default(true),
})
export type IgnoreTrainingDto = z.input<typeof ignoreTrainingSchema>

export const restoreTrainingSchema = z.object({
  trainingId: z.coerce.number().int().positive(),
})
export type RestoreTrainingDto = z.input<typeof restoreTrainingSchema>

export interface TrainingPerson {
  id: number
  name: string
}

/** Shape returned to the client (serializable). */
export interface Training {
  id: number
  startsAt: string
  endsAt: string
  /** `removed` = deleted from / moved in the source calendar. */
  /** `ignored` = marked in the UI as not a training. */
  status: 'confirmed' | 'cancelled' | 'removed' | 'ignored'
  title: string
  /** Name extracted from the calendar entry (may differ from client.name). */
  clientName: string | null
  location: string | null
  notes: string | null
  trainer: TrainingPerson
  /** `null` = unresolved, needs manual assignment. */
  client: TrainingPerson | null
  clientAssignedManually: boolean
}

export interface ImportSummary {
  calendars: number
  created: number
  updated: number
  /** Events recognised as non-trainings (all-day, "Urlop", meetings…). */
  skipped: number
  cancelled: number
  /** Events imported as `ignored` (title marked "not a training"). */
  ignored: number
  /** Previously imported trainings no longer present in the calendar. */
  removed: number
  unassigned: number
  trainersCreated: number
  clientsCreated: number
}

export interface TrainingsPage extends Page<Training> {
  /** Not removed/ignored and without a client – regardless of filters. */
  unassignedTotal: number
}
