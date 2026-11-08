import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { Badge } from '#/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Skeleton } from '#/components/ui/skeleton'
import { useFormatters } from '#/i18n/use-locale'
import type { PersonRef } from '#/shared/billing/billing.dto'
import { userBillingHistoryQueryOptions } from '../billing.queries'
import { PeriodList } from './period-list'

/** Every plan a client has been on, newest first, with its periods. */
export function HistoryDialog({
  client,
  onOpenChange,
}: {
  client: PersonRef | null
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()
  return (
    <Dialog open={client !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {t('billing.history.title', { name: client?.name ?? '' })}
          </DialogTitle>
          <DialogDescription>
            {t('billing.history.description')}
          </DialogDescription>
        </DialogHeader>
        {client && <HistoryContent userId={client.id} />}
      </DialogContent>
    </Dialog>
  )
}

function HistoryContent({ userId }: { userId: number }) {
  const { t } = useTranslation()
  const format = useFormatters()
  const { data, isPending } = useQuery(userBillingHistoryQueryOptions(userId))

  if (isPending) return <Skeleton className="h-32 w-full" />
  if (!data || data.plans.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        {t('billing.history.empty')}
      </p>
    )
  }

  return (
    <ol className="space-y-4">
      {data.plans.map((plan) => (
        <li key={plan.id} className="space-y-2 rounded-lg border p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">
              {t(`billing.plans.${plan.planType}`)}
            </span>
            {plan.familyGroup && (
              <span className="text-muted-foreground">
                ({plan.familyGroup.name})
              </span>
            )}
            <span className="text-muted-foreground text-sm">
              {plan.coversHistory
                ? t('billing.wholeHistory')
                : format.localDate(plan.validFrom)}{' '}
              –{' '}
              {plan.validTo
                ? format.localDate(plan.validTo)
                : t('billing.history.now')}
            </span>
            {plan.validTo === null && (
              <Badge variant="secondary">{t('billing.history.current')}</Badge>
            )}
          </div>
          {plan.planType === 'family' ? (
            <p className="text-muted-foreground text-sm">
              {t('billing.history.familyHint')}
            </p>
          ) : (
            <PeriodList
              clientPlanId={plan.id}
              periods={plan.periods}
              since={plan.coversHistory ? undefined : plan.validFrom}
            />
          )}
        </li>
      ))}
    </ol>
  )
}
