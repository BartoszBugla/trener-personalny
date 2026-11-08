import { sql } from 'drizzle-orm'
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core'

import { users } from '../users/users.table'
import { PLAN_TYPES } from '../../../shared/billing/billing.dto'

/** A group of people sharing training packages (e.g. "Kowalscy"). */
export const familyGroups = sqliteTable('family_groups', {
  id: integer({ mode: 'number' }).primaryKey({ autoIncrement: true }),
  name: text().notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
})

/**
 * Which billing plan a user is on, and when. Never edited in place: changing a
 * plan closes the current row (`validTo`) and inserts a new one, so the full
 * history of how someone was billed is kept.
 *
 * Dates are local (Europe/Warsaw) `YYYY-MM-DD`; `validTo` is exclusive.
 */
export const clientPlans = sqliteTable(
  'client_plans',
  {
    id: integer({ mode: 'number' }).primaryKey({ autoIncrement: true }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    planType: text('plan_type', { enum: PLAN_TYPES }).notNull(),
    /** Set only for `family` plans – membership in a family group. */
    familyGroupId: integer('family_group_id').references(
      () => familyGroups.id,
      { onDelete: 'restrict' },
    ),
    validFrom: text('valid_from').notNull(),
    validTo: text('valid_to'),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [
    index('client_plans_user_id_idx').on(t.userId),
    index('client_plans_family_group_id_idx').on(t.familyGroupId),
  ],
)

/**
 * Billing periods of individual plans that have been closed by sending the
 * payment-reminder SMS. Freezing the boundaries here keeps them stable even if
 * later calendar imports move or remove trainings. Periods without a row are
 * computed live from trainings.
 */
export const billingPeriods = sqliteTable(
  'billing_periods',
  {
    id: integer({ mode: 'number' }).primaryKey({ autoIncrement: true }),
    clientPlanId: integer('client_plan_id')
      .notNull()
      .references(() => clientPlans.id, { onDelete: 'cascade' }),
    /** First training (N-trainings plans) or month start (monthly). */
    startsAt: integer('starts_at', { mode: 'timestamp' }).notNull(),
    /** Last training (N-trainings plans) or month end (monthly). */
    endsAt: integer('ends_at', { mode: 'timestamp' }).notNull(),
    trainingCount: integer('training_count').notNull(),
    smsSentAt: integer('sms_sent_at', { mode: 'timestamp' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [
    uniqueIndex('billing_periods_plan_start_idx').on(
      t.clientPlanId,
      t.startsAt,
    ),
  ],
)

/**
 * "Paid" free text of an individual plan's period ("przelew 12.11"). Kept
 * apart from `billingPeriods` on purpose: it can be filled in any time (also
 * for a period in progress) and must not freeze the period's boundaries.
 * Keyed by the period start, like the overview returns it.
 */
export const billingPaymentNotes = sqliteTable(
  'billing_payment_notes',
  {
    id: integer({ mode: 'number' }).primaryKey({ autoIncrement: true }),
    clientPlanId: integer('client_plan_id')
      .notNull()
      .references(() => clientPlans.id, { onDelete: 'cascade' }),
    periodStartsAt: integer('period_starts_at', {
      mode: 'timestamp',
    }).notNull(),
    note: text().notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [
    uniqueIndex('billing_payment_notes_plan_start_idx').on(
      t.clientPlanId,
      t.periodStartsAt,
    ),
  ],
)

/**
 * A one-off pool of trainings bought by a family group (10 now, 5 next time…).
 * Members' trainings consume packages in order; the reminder SMS is sent once
 * the pool is used up.
 */
export const familyPackages = sqliteTable(
  'family_packages',
  {
    id: integer({ mode: 'number' }).primaryKey({ autoIncrement: true }),
    familyGroupId: integer('family_group_id')
      .notNull()
      .references(() => familyGroups.id, { onDelete: 'cascade' }),
    size: integer().notNull(),
    /** Local date from which trainings count towards this package. */
    startsOn: text('starts_on').notNull(),
    smsSentAt: integer('sms_sent_at', { mode: 'timestamp' }),
    notes: text(),
    /** Free text about the payment ("przelew 12.11", "gotówka 200 zł"). */
    paymentNote: text('payment_note'),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [index('family_packages_group_id_idx').on(t.familyGroupId)],
)

export type FamilyGroupRow = typeof familyGroups.$inferSelect
export type ClientPlanRow = typeof clientPlans.$inferSelect
export type NewClientPlanRow = typeof clientPlans.$inferInsert
export type BillingPeriodRow = typeof billingPeriods.$inferSelect
export type FamilyPackageRow = typeof familyPackages.$inferSelect
export type BillingPaymentNoteRow = typeof billingPaymentNotes.$inferSelect
