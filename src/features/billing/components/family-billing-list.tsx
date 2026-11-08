import { AlertTriangle, Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '#/components/ui/button'
import { Checkbox } from '#/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Progress } from '#/components/ui/progress'
import { useFormatters } from '#/i18n/use-locale'
import { cn } from '#/lib/utils'
import type {
  FamilyBillingRow,
  FamilyPackageSummary,
  PersonRef,
} from '#/shared/billing/billing.dto'
import {
  useCreateFamilyPackage,
  useSetPackagePayment,
  useSetPackageSms,
} from '../billing.queries'
import { ConfirmUnmarkSmsDialog } from './confirm-unmark-sms-dialog'
import { PaymentNoteInput } from './payment-note-input'
import { todayLocal } from './format'

/** Family groups with their shared training packages. */
export function FamilyBillingList({ rows }: { rows: Array<FamilyBillingRow> }) {
  const { t } = useTranslation()
  const format = useFormatters()
  const [addingTo, setAddingTo] = useState<PersonRef | null>(null)

  if (rows.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        {t('billing.family.empty')}
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {rows.map((row) => (
        <section key={row.group.id} className="space-y-3 rounded-lg border p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold">{row.group.name}</h3>
              <p className="text-muted-foreground text-sm">
                {row.members.length > 0
                  ? row.members
                      .map((m) =>
                        t('billing.family.memberSince', {
                          name: m.name,
                          date: format.localDate(m.since),
                        }),
                      )
                      .join(', ')
                  : t('billing.family.noMembers')}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setAddingTo(row.group)}
            >
              <Plus className="size-4" /> {t('billing.family.addPackage')}
            </Button>
          </div>

          {row.uncoveredTrainings > 0 && (
            <p className="bg-destructive/10 text-destructive flex items-center gap-2 rounded-md px-3 py-2 text-sm">
              <AlertTriangle className="size-4" />
              {t('billing.family.uncovered', { count: row.uncoveredTrainings })}
            </p>
          )}

          {row.packages.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {t('billing.family.noPackages')}
            </p>
          ) : (
            <ul className="space-y-2">
              {row.packages.map((p) => (
                <PackageItem key={p.id} pkg={p} />
              ))}
            </ul>
          )}
        </section>
      ))}

      <AddPackageDialog group={addingTo} onClose={() => setAddingTo(null)} />
    </div>
  )
}

function PackageItem({ pkg }: { pkg: FamilyPackageSummary }) {
  const { t } = useTranslation()
  const format = useFormatters()
  const setSms = useSetPackageSms()
  const setPayment = useSetPackagePayment()
  const [confirming, setConfirming] = useState(false)
  const id = `pkg-sms-${pkg.id}`
  const due = pkg.complete && !pkg.smsSentAt

  return (
    <li
      className={cn(
        'grid items-center gap-x-4 gap-y-1 rounded-md px-2 py-2 text-sm sm:grid-cols-[auto_1fr_10rem_minmax(9rem,12rem)_8rem]',
        due && 'bg-destructive/10',
      )}
    >
      <Checkbox
        id={id}
        checked={pkg.smsSentAt !== null}
        disabled={setSms.isPending}
        onCheckedChange={(checked) =>
          checked === true
            ? setSms.mutate({ packageId: pkg.id, sent: true })
            : setConfirming(true)
        }
        aria-label={t('billing.sms.sentAria')}
      />
      <label htmlFor={id}>
        <span className="font-medium">
          {t('billing.periods.trainings', { count: pkg.size })}
        </span>{' '}
        <span className="text-muted-foreground">
          {t('billing.family.packageFrom', {
            date: format.localDate(pkg.startsOn),
          })}
          {pkg.firstTrainingAt &&
            ` · ${t('billing.family.usedBetween', {
              from: format.date(pkg.firstTrainingAt),
              to: pkg.lastTrainingAt ? format.date(pkg.lastTrainingAt) : '',
            })}`}
          {pkg.notes && ` · ${pkg.notes}`}
        </span>
      </label>
      <div className="flex items-center gap-2">
        <Progress value={(pkg.used / pkg.size) * 100} className="h-2" />
        <span className="text-muted-foreground tabular-nums">
          {pkg.used}/{pkg.size}
        </span>
      </div>
      <PaymentNoteInput
        value={pkg.paymentNote}
        placeholder={`${t('billing.payment.label')}: ${t('billing.payment.placeholder')}`}
        ariaLabel={t('billing.payment.aria', {
          period: t('billing.family.packageFrom', {
            date: format.localDate(pkg.startsOn),
          }),
        })}
        onSave={(note) => setPayment.mutateAsync({ packageId: pkg.id, note })}
      />
      <span
        className={cn(
          'text-right text-xs',
          due ? 'text-destructive font-medium' : 'text-muted-foreground',
        )}
      >
        {pkg.smsSentAt
          ? t('billing.sms.sentOn', { date: format.date(pkg.smsSentAt) })
          : pkg.complete
            ? t('billing.family.usedUp')
            : t('billing.family.left', { count: pkg.size - pkg.used })}
      </span>
      <ConfirmUnmarkSmsDialog
        open={confirming}
        description={t('billing.unmarkSms.package', {
          count: pkg.size,
          date: format.localDate(pkg.startsOn),
        })}
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setSms.mutate({ packageId: pkg.id, sent: false })
          setConfirming(false)
        }}
      />
    </li>
  )
}

function AddPackageDialog({
  group,
  onClose,
}: {
  group: PersonRef | null
  onClose: () => void
}) {
  const { t } = useTranslation()
  const create = useCreateFamilyPackage()
  const [size, setSize] = useState('10')
  const [startsOn, setStartsOn] = useState(todayLocal())
  const [notes, setNotes] = useState('')
  const sizeNumber = Number(size)
  const valid = Number.isInteger(sizeNumber) && sizeNumber > 0 && !!startsOn

  return (
    <Dialog open={group !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t('billing.family.newPackageTitle', { name: group?.name ?? '' })}
          </DialogTitle>
          <DialogDescription>
            {t('billing.family.newPackageDescription')}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="pkg-size">{t('billing.family.size')}</Label>
            <Input
              id="pkg-size"
              type="number"
              min={1}
              value={size}
              onChange={(e) => setSize(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="pkg-start">{t('billing.assign.from')}</Label>
            <Input
              id="pkg-start"
              type="date"
              value={startsOn}
              onChange={(e) => setStartsOn(e.target.value)}
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="pkg-notes">{t('billing.family.notes')}</Label>
            <Input
              id="pkg-notes"
              placeholder={t('common.optional')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            disabled={!valid || create.isPending || !group}
            onClick={async () => {
              if (!group) return
              await create.mutateAsync({
                familyGroupId: group.id,
                size: sizeNumber,
                startsOn,
                notes: notes.trim() || undefined,
              })
              onClose()
            }}
          >
            {create.isPending
              ? t('common.saving')
              : t('billing.family.addPackage')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
