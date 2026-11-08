import { createServerFn } from '@tanstack/react-start'

import { defaultMiddleware } from '#/lib/server-fn/middleware'
import { resolve } from '#/server/app'
import { CalendarImportService } from '#/server/modules/calendar-import/calendar-import.service'
import { readUploadedCalendars } from '#/server/modules/calendar-import/uploaded-calendars'
import { TrainingsService } from '#/server/modules/trainings/trainings.service'
import {
  assignClientSchema,
  ignoreTrainingSchema,
  listTrainingsSchema,
  restoreTrainingSchema,
  trainingsRangeSchema,
} from '#/shared/trainings/trainings.dto'

export const getTrainings = createServerFn({ method: 'GET' })
  .middleware(defaultMiddleware)
  .validator(listTrainingsSchema)
  .handler(({ data }) => resolve(TrainingsService).list(data))

/** Trainings in a date range, for the calendar view. */
export const getTrainingsRange = createServerFn({ method: 'GET' })
  .middleware(defaultMiddleware)
  .validator(trainingsRangeSchema)
  .handler(({ data }) => resolve(TrainingsService).listRange(data))

/** Pulls trainer calendars from the configured source and upserts trainings. */
export const importTrainings = createServerFn({ method: 'POST' })
  .middleware(defaultMiddleware)
  .handler(() => resolve(CalendarImportService).importAll())

/**
 * Imports trainer calendars from uploaded .ics files (multipart form:
 * `files` + optional parallel `calendarIds`, see `calendar-upload.ts`).
 */
export const uploadTrainingsCalendars = createServerFn({ method: 'POST' })
  .middleware(defaultMiddleware)
  .validator((data: FormData) => {
    if (!(data instanceof FormData)) throw new Error('Expected FormData')
    return data
  })
  .handler(async ({ data }) =>
    resolve(CalendarImportService).importCalendars(
      await readUploadedCalendars(data),
    ),
  )

export const assignTrainingClient = createServerFn({ method: 'POST' })
  .middleware(defaultMiddleware)
  .validator(assignClientSchema)
  .handler(({ data }) => resolve(TrainingsService).assignClient(data))

/** Marks an event as "not a training" (optionally all with the same title). */
export const ignoreTraining = createServerFn({ method: 'POST' })
  .middleware(defaultMiddleware)
  .validator(ignoreTrainingSchema)
  .handler(({ data }) => resolve(TrainingsService).ignore(data))

export const restoreTraining = createServerFn({ method: 'POST' })
  .middleware(defaultMiddleware)
  .validator(restoreTrainingSchema)
  .handler(({ data }) => resolve(TrainingsService).restore(data))
