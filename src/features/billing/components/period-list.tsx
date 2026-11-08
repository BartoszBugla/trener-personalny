import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '#/components/ui/button'
import { Checkbox } from '#/components/ui/checkbox'
import { useFormatters } from '#/i18n/use-locale'
import { cn } from '#/lib/utils'
import type { BillingPeriod } from '#/shared/billing/billing.dto'
import { useSetPeriodPayment, useSetPeriodSms } from '../billing.queries'
import { ConfirmUnmarkSmsDialog } from './confirm-unmark-sms-dialog'
import { PaymentNoteInput } from './payment-note-input'

const COLLAPSED_COUNT = 3

/** A finished period whose reminder SMS hasn't been sent yet. */
export const isSmsDue = (p: BillingPeriod) => p.complete && !p.smsSentAt

/** Columns: SMS checkbox · period · trainings · paid · SMS status. */
const ROW_GRID =
  'grid grid-cols-[auto_minmax(9rem,1fr)_4.5rem_minmax(9rem,12rem)_7rem] items-center gap-x-3'

/**
 * Billing periods (newest first) with the "reminder SMS sent" checkbox and
 * the "paid" free text. Only finished periods can be ticked; due ones are
 * highlighted. "Paid" can be filled in any time (also for past plans).
 */
export function PeriodList({
  clientPlanId,
  periods,
  readOnly = false,
  since,
}: {
  clientPlanId: number
  periods: Array<BillingPeriod>
  readOnly?: boolean
  /** Plan start (local date) – shown when there are no trainings yet. */
  since?: string
}) {
  const { t } = useTranslation()
  const format = useFormatters()
  const setSms = useSetPeriodSms()
  const setPayment = useSetPeriodPayment()
  const [expanded, setExpanded] = useState(false)
  const [unmarking, setUnmarking] = useState<BillingPeriod | null>(null)

  const periodLabel = (p: BillingPeriod) =>
    p.targetCount === null
      ? format.month(p.startsAt)
      : `${format.date(p.startsAt)} – ${p.complete ? format.date(p.endsAt) : '…'}`

  if (periods.length === 0) {
    return (
      <span className="text-muted-foreground text-sm">
        {since
          ? t('billing.periods.emptySince', { date: format.localDate(since) })
          : t('billing.periods.empty')}
      </span>
    )
  }

  const visible = expanded ? periods : periods.slice(0, COLLAPSED_COUNT)

  return (
    <ul className="space-y-1">
      <li
        className={cn(
          ROW_GRID,
          'text-muted-foreground px-2 text-xs font-medium',
        )}
        aria-hidden
      >
        <span className="w-4" />
        <span>{t('billing.periods.period')}</span>
        <span>{t('billing.periods.trainingsHeader')}</span>
        <span>{t('billing.payment.label')}</span>
        <span className="text-right">{t('billing.periods.sms')}</span>
      </li>
      {visible.map((p) => {
        const id = `sms-${clientPlanId}-${p.startsAt}`
        const label = periodLabel(p)
        return (
          <li
            key={p.startsAt}
            className={cn(
              ROW_GRID,
              'rounded-md px-2 py-1 text-sm',
              isSmsDue(p) && 'bg-destructive/10 text-destructive',
            )}
          >
            <Checkbox
              id={id}
              checked={p.smsSentAt !== null}
              disabled={readOnly || !p.complete || setSms.isPending}
              onCheckedChange={(checked) =>
                checked === true
                  ? setSms.mutate({
                      clientPlanId,
                      startsAt: p.startsAt,
                      sent: true,
                    })
                  : setUnmarking(p)
              }
              aria-label={t('billing.sms.sentAria')}
            />
            <label htmlFor={id}>{label}</label>
            <span className="text-muted-foreground tabular-nums">
              {p.targetCount === null
                ? t('billing.periods.trainings', { count: p.trainingCount })
                : `${p.trainingCount}/${p.targetCount}`}
            </span>
            <PaymentNoteInput
              value={p.paymentNote}
              placeholder={t('billing.payment.placeholder')}
              ariaLabel={t('billing.payment.aria', { period: label })}
              onSave={(note) =>
                setPayment.mutateAsync({
                  clientPlanId,
                  startsAt: p.startsAt,
                  note,
                })
              }
            />
            <span className="text-muted-foreground text-right text-xs">
              {p.smsSentAt
                ? t('billing.sms.sentOn', { date: format.date(p.smsSentAt) })
                : p.complete
                  ? t('billing.sms.due')
                  : t('billing.periods.inProgress')}
            </span>
          </li>
        )
      })}
      {periods.length > COLLAPSED_COUNT && (
        <li>
          <Button
            variant="link"
            size="sm"
            className="h-auto px-2"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded
              ? t('billing.periods.showLess')
              : t('billing.periods.showAll', { count: periods.length })}
          </Button>
        </li>
      )}
      <ConfirmUnmarkSmsDialog
        open={unmarking !== null}
        description={
          unmarking
            ? t(
                unmarking.targetCount === null
                  ? 'billing.unmarkSms.month'
                  : 'billing.unmarkSms.period',
                { period: periodLabel(unmarking) },
              )
            : ''
        }
        onCancel={() => setUnmarking(null)}
        onConfirm={() => {
          if (unmarking) {
            setSms.mutate({
              clientPlanId,
              startsAt: unmarking.startsAt,
              sent: false,
            })
          }
          setUnmarking(null)
        }}
      />
    </ul>
  )
}
