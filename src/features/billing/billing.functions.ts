import { createServerFn } from '@tanstack/react-start'

import { defaultMiddleware } from '#/lib/server-fn/middleware'
import { resolve } from '#/server/app'
import { BillingService } from '#/server/modules/billing/billing.service'
import {
  assignPlanSchema,
  correctPlanSchema,
  planIdSchema,
  createFamilyGroupSchema,
  createFamilyPackageSchema,
  setPackagePaymentSchema,
  setPackageSmsSchema,
  setPeriodPaymentSchema,
  setPeriodSmsSchema,
  userHistorySchema,
} from '#/shared/billing/billing.dto'

export const getBillingOverview = createServerFn({ method: 'GET' })
  .middleware(defaultMiddleware)
  .handler(() => resolve(BillingService).getOverview())

export const getUserBillingHistory = createServerFn({ method: 'GET' })
  .middleware(defaultMiddleware)
  .validator(userHistorySchema)
  .handler(({ data }) => resolve(BillingService).getUserHistory(data.userId))

export const assignPlan = createServerFn({ method: 'POST' })
  .middleware(defaultMiddleware)
  .validator(assignPlanSchema)
  .handler(({ data }) => resolve(BillingService).assignPlan(data))

export const correctPlan = createServerFn({ method: 'POST' })
  .middleware(defaultMiddleware)
  .validator(correctPlanSchema)
  .handler(({ data }) => resolve(BillingService).correctPlan(data))

export const removePlan = createServerFn({ method: 'POST' })
  .middleware(defaultMiddleware)
  .validator(planIdSchema)
  .handler(({ data }) => resolve(BillingService).removePlan(data.planId))

export const createFamilyGroup = createServerFn({ method: 'POST' })
  .middleware(defaultMiddleware)
  .validator(createFamilyGroupSchema)
  .handler(({ data }) => resolve(BillingService).createFamilyGroup(data))

export const createFamilyPackage = createServerFn({ method: 'POST' })
  .middleware(defaultMiddleware)
  .validator(createFamilyPackageSchema)
  .handler(({ data }) => resolve(BillingService).createFamilyPackage(data))

export const setPeriodSms = createServerFn({ method: 'POST' })
  .middleware(defaultMiddleware)
  .validator(setPeriodSmsSchema)
  .handler(({ data }) => resolve(BillingService).setPeriodSms(data))

export const setPackageSms = createServerFn({ method: 'POST' })
  .middleware(defaultMiddleware)
  .validator(setPackageSmsSchema)
  .handler(({ data }) => resolve(BillingService).setPackageSms(data))

/** "Paid" free text of a period (empty clears it). */
export const setPeriodPayment = createServerFn({ method: 'POST' })
  .middleware(defaultMiddleware)
  .validator(setPeriodPaymentSchema)
  .handler(({ data }) => resolve(BillingService).setPeriodPayment(data))

/** "Paid" free text of a family package (empty clears it). */
export const setPackagePayment = createServerFn({ method: 'POST' })
  .middleware(defaultMiddleware)
  .validator(setPackagePaymentSchema)
  .handler(({ data }) => resolve(BillingService).setPackagePayment(data))
