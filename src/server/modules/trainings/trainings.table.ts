import { sql } from 'drizzle-orm'
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core'

import { users } from '../users/users.table'

/**
 * `removed` = no longer in the source calendar (kept for history).
 * `ignored` = marked in the UI as not a training (errand, note…); re-imports
 * keep it ignored.
 */
export const TRAINING_STATUSES = [
  'confirmed',
  'cancelled',
  'removed',
  'ignored',
] as const
/** Statuses of trainings that actually belong to the schedule. */
export const ACTIVE_TRAINING_STATUSES = ['confirmed', 'cancelled'] as const
export type TrainingStatus = (typeof TRAINING_STATUSES)[number]

/** Where a training came from. Only ICS today; Google Calendar API later. */
export const TRAINING_SOURCES = ['ics'] as const
export type TrainingSource = (typeof TRAINING_SOURCES)[number]

export const trainings = sqliteTable(
  'trainings',
  {
    id: integer({ mode: 'number' }).primaryKey({ autoIncrement: true }),
    trainerId: integer('trainer_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    /** NULL = client not resolved yet; must be assigned manually in the UI. */
    clientId: integer('client_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    /** True once a human picked the client – re-imports never override it. */
    clientAssignedManually: integer('client_assigned_manually', {
      mode: 'boolean',
    })
      .notNull()
      .default(false),
    startsAt: integer('starts_at', { mode: 'timestamp' }).notNull(),
    endsAt: integer('ends_at', { mode: 'timestamp' }).notNull(),
    status: text({ enum: TRAINING_STATUSES }).notNull().default('confirmed'),
    /** Original event title, e.g. "PT – Tomasz Wójcik". */
    title: text().notNull(),
    /** Client name extracted from the title, e.g. "Tomasz Wójcik". */
    clientName: text('client_name'),
    location: text(),
    notes: text(),
    source: text({ enum: TRAINING_SOURCES }).notNull(),
    /** Stable id of the occurrence in the source (calendar + UID + recurrence id). */
    externalId: text('external_id').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [
    uniqueIndex('trainings_source_external_id_idx').on(t.source, t.externalId),
    index('trainings_starts_at_idx').on(t.startsAt),
    index('trainings_trainer_id_idx').on(t.trainerId),
    index('trainings_client_id_idx').on(t.clientId),
  ],
)

/**
 * Calendar titles marked "not a training" for good: every event with this
 * (normalized) title is imported as `ignored`.
 */
export const ignoredTitles = sqliteTable('ignored_titles', {
  normalizedTitle: text('normalized_title').primaryKey(),
  /** Title as it was when ignored, for display. */
  title: text().notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
})

export type TrainingRow = typeof trainings.$inferSelect
export type NewTrainingRow = typeof trainings.$inferInsert
