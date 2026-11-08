import { History, Repeat } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '#/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { useFormatters } from '#/i18n/use-locale'
import type {
  IndividualBillingRow,
  PersonRef,
  PlanSummary,
} from '#/shared/billing/billing.dto'
import { PeriodList, isSmsDue } from './period-list'

/** Clients on an N-trainings or monthly plan. */
export function IndividualBillingTable({
  rows,
  onChangePlan,
  onShowHistory,
}: {
  rows: Array<IndividualBillingRow>
  onChangePlan: (client: PersonRef, plan: PlanSummary) => void
  onShowHistory: (client: PersonRef) => void
}) {
  const { t } = useTranslation()
  const format = useFormatters()

  if (rows.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        {t('billing.individual.empty')}
      </p>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-48">
            {t('billing.individual.client')}
          </TableHead>
          <TableHead className="w-32">
            {t('billing.individual.since')}
          </TableHead>
          <TableHead>{t('billing.individual.periods')}</TableHead>
          <TableHead className="w-24" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const due = row.periods.filter(isSmsDue).length
          return (
            <TableRow key={row.plan.id} className="align-top">
              <TableCell className="font-medium">
                <div>{row.client.name}</div>
                {due > 0 && (
                  <div className="text-destructive text-xs font-normal">
                    {t('billing.sms.dueCount', { count: due })}
                  </div>
                )}
              </TableCell>
              <TableCell>
                {row.plan.coversHistory
                  ? t('billing.wholeHistory')
                  : format.localDate(row.plan.validFrom)}
              </TableCell>
              <TableCell>
                <PeriodList
                  clientPlanId={row.plan.id}
                  periods={row.periods}
                  since={
                    row.plan.coversHistory ? undefined : row.plan.validFrom
                  }
                />
              </TableCell>
              <TableCell>
                <div className="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    title={t('billing.actions.changePlan')}
                    aria-label={t('billing.actions.changePlan')}
                    onClick={() => onChangePlan(row.client, row.plan)}
                  >
                    <Repeat className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title={t('billing.actions.history')}
                    aria-label={t('billing.actions.history')}
                    onClick={() => onShowHistory(row.client)}
                  >
                    <History className="size-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
