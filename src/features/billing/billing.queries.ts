import {
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import type { en } from '#/i18n/locales/en'

import {
  assignPlan,
  correctPlan,
  createFamilyGroup,
  createFamilyPackage,
  getBillingOverview,
  getUserBillingHistory,
  removePlan,
  setPackagePayment,
  setPackageSms,
  setPeriodPayment,
  setPeriodSms,
} from './billing.functions'
import type {
  AssignPlanDto,
  CorrectPlanDto,
  CreateFamilyGroupDto,
  CreateFamilyPackageDto,
  SetPackagePaymentDto,
  SetPackageSmsDto,
  SetPeriodPaymentDto,
  SetPeriodSmsDto,
} from '#/shared/billing/billing.dto'

export const billingKeys = {
  all: ['billing'] as const,
  overview: () => [...billingKeys.all, 'overview'] as const,
  history: (userId: number) => [...billingKeys.all, 'history', userId] as const,
}

export const billingOverviewQueryOptions = () =>
  queryOptions({
    queryKey: billingKeys.overview(),
    queryFn: () => getBillingOverview(),
  })

export const userBillingHistoryQueryOptions = (userId: number) =>
  queryOptions({
    queryKey: billingKeys.history(userId),
    queryFn: () => getUserBillingHistory({ data: { userId } }),
  })

/** All billing mutations refresh every billing query. */
function useBillingMutation<TInput, TResult>(
  mutationFn: (data: TInput) => Promise<TResult>,
  successKey?: `billing.toast.${keyof typeof en.billing.toast}`,
) {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useMutation({
    mutationFn,
    onSuccess: () => {
      if (successKey) toast.success(t(successKey))
      return queryClient.invalidateQueries({ queryKey: billingKeys.all })
    },
    onError: (error) => toast.error(error.message),
  })
}

export const useAssignPlan = () =>
  useBillingMutation(
    (data: AssignPlanDto) => assignPlan({ data }),
    'billing.toast.planAssigned',
  )

export const useCorrectPlan = () =>
  useBillingMutation(
    (data: CorrectPlanDto) => correctPlan({ data }),
    'billing.toast.startCorrected',
  )

export const useRemovePlan = () =>
  useBillingMutation(
    (planId: number) => removePlan({ data: { planId } }),
    'billing.toast.planRemoved',
  )

export const useCreateFamilyGroup = () =>
  useBillingMutation(
    (data: CreateFamilyGroupDto) => createFamilyGroup({ data }),
    'billing.toast.groupCreated',
  )

export const useCreateFamilyPackage = () =>
  useBillingMutation(
    (data: CreateFamilyPackageDto) => createFamilyPackage({ data }),
    'billing.toast.packageAdded',
  )

export const useSetPeriodSms = () =>
  useBillingMutation((data: SetPeriodSmsDto) => setPeriodSms({ data }))

export const useSetPackageSms = () =>
  useBillingMutation((data: SetPackageSmsDto) => setPackageSms({ data }))

export const useSetPeriodPayment = () =>
  useBillingMutation(
    (data: SetPeriodPaymentDto) => setPeriodPayment({ data }),
    'billing.toast.paymentSaved',
  )

export const useSetPackagePayment = () =>
  useBillingMutation(
    (data: SetPackagePaymentDto) => setPackagePayment({ data }),
    'billing.toast.paymentSaved',
  )
