import { z } from 'zod'

/**
 * Billing plans:
 * - `trainings_N` – a period closes on the client's N-th attended training,
 *   the next one starts with the following training;
 * - `monthly`     – calendar months;
 * - `family`      – a group shares one-off packages of trainings.
 */
export const PLAN_TYPES = [
  'trainings_4',
  'trainings_8',
  'trainings_12',
  'monthly',
  'family',
] as const
export type PlanType = (typeof PLAN_TYPES)[number]

/** Trainings per period for N-trainings plans. */
export const PLAN_PERIOD_SIZE: Partial<Record<PlanType, number>> = {
  trainings_4: 4,
  trainings_8: 8,
  trainings_12: 12,
}

const localDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'validation.dateFormat')
  .refine(
    (v) => !Number.isNaN(Date.parse(`${v}T00:00:00Z`)),
    'validation.invalidDate',
  )

export const assignPlanSchema = z
  .object({
    userId: z.coerce.number().int().positive(),
    planType: z.enum(PLAN_TYPES),
    /**
     * Required when changing an existing plan. A client's first plan covers
     * all their trainings, past ones included, so no date is needed.
     */
    validFrom: localDate.optional(),
    familyGroupId: z.coerce.number().int().positive().optional(),
  })
  .refine((v) => v.planType !== 'family' || v.familyGroupId, {
    message: 'validation.familyGroupRequired',
    path: ['familyGroupId'],
  })
export type AssignPlanDto = z.infer<typeof assignPlanSchema>

export const createFamilyGroupSchema = z.object({
  name: z.string().trim().min(1, 'validation.nameRequired').max(200),
})
export type CreateFamilyGroupDto = z.infer<typeof createFamilyGroupSchema>

export const createFamilyPackageSchema = z.object({
  familyGroupId: z.coerce.number().int().positive(),
  size: z.coerce.number().int().min(1).max(500),
  startsOn: localDate,
  notes: z.string().trim().max(500).optional(),
})
export type CreateFamilyPackageDto = z.infer<typeof createFamilyPackageSchema>

export const setPeriodSmsSchema = z.object({
  clientPlanId: z.coerce.number().int().positive(),
  /** ISO start of the period as returned by the overview. */
  startsAt: z.iso.datetime(),
  sent: z.boolean(),
})
export type SetPeriodSmsDto = z.infer<typeof setPeriodSmsSchema>

export const setPackageSmsSchema = z.object({
  packageId: z.coerce.number().int().positive(),
  sent: z.boolean(),
})
export type SetPackageSmsDto = z.infer<typeof setPackageSmsSchema>

/** "Paid" free text; empty clears it. */
const paymentNote = z.string().trim().max(200)

export const setPeriodPaymentSchema = z.object({
  clientPlanId: z.coerce.number().int().positive(),
  /** ISO start of the period as returned by the overview. */
  startsAt: z.iso.datetime(),
  note: paymentNote,
})
export type SetPeriodPaymentDto = z.infer<typeof setPeriodPaymentSchema>

export const setPackagePaymentSchema = z.object({
  packageId: z.coerce.number().int().positive(),
  note: paymentNote,
})
export type SetPackagePaymentDto = z.infer<typeof setPackagePaymentSchema>

/** Fixes a mistake in the current plan (only before any SMS was sent). */
export const correctPlanSchema = z.object({
  planId: z.coerce.number().int().positive(),
  validFrom: localDate,
})
export type CorrectPlanDto = z.infer<typeof correctPlanSchema>

export const planIdSchema = z.object({
  planId: z.coerce.number().int().positive(),
})

export const userHistorySchema = z.object({
  userId: z.coerce.number().int().positive(),
})

/* ---------- Response shapes (serializable) ---------- */

export interface BillingPeriod {
  startsAt: string
  endsAt: string
  trainingCount: number
  /** Trainings needed to close the period (N), or null for monthly. */
  targetCount: number | null
  /** Period finished – the reminder SMS is due. */
  complete: boolean
  smsSentAt: string | null
  /** "Paid" free text, e.g. "przelew 12.11". */
  paymentNote: string | null
}

export interface PersonRef {
  id: number
  name: string
}

export interface PlanSummary {
  id: number
  planType: PlanType
  validFrom: string
  validTo: string | null
  familyGroup: PersonRef | null
  /** The client's first plan – also covers every training before `validFrom`. */
  coversHistory: boolean
}

export interface IndividualBillingRow {
  client: PersonRef
  plan: PlanSummary
  /** Newest first. */
  periods: Array<BillingPeriod>
}

export interface FamilyPackageSummary {
  id: number
  size: number
  used: number
  startsOn: string
  firstTrainingAt: string | null
  lastTrainingAt: string | null
  complete: boolean
  smsSentAt: string | null
  notes: string | null
  /** "Paid" free text, e.g. "gotówka 400 zł". */
  paymentNote: string | null
}

export interface FamilyBillingRow {
  group: PersonRef
  members: Array<PersonRef & { since: string }>
  /** Newest first. */
  packages: Array<FamilyPackageSummary>
  /** Members' trainings not covered by any package – a new package is needed. */
  uncoveredTrainings: number
}

export interface BillingOverview {
  individual: Array<IndividualBillingRow>
  family: Array<FamilyBillingRow>
  /** Clients (non-trainers) without a current plan. */
  withoutPlan: Array<
    PersonRef & {
      /** Local date of the first attended training (default plan start). */
      firstTrainingOn: string | null
    }
  >
  familyGroups: Array<PersonRef>
}

export interface UserBillingHistory {
  client: PersonRef
  /** Newest first, including closed plans. */
  plans: Array<PlanSummary & { periods: Array<BillingPeriod> }>
}
