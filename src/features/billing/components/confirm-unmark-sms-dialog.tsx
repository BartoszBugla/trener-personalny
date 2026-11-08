import { useTranslation } from 'react-i18next'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '#/components/ui/alert-dialog'

/**
 * Asks before un-ticking "reminder SMS sent" – un-ticking reopens the item as
 * "SMS due" (and, for periods, unfreezes its boundaries).
 */
export function ConfirmUnmarkSmsDialog({
  open,
  description,
  onConfirm,
  onCancel,
}: {
  open: boolean
  description: string
  onConfirm: () => void
  onCancel: () => void
}) {
  const { t } = useTranslation()

  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('billing.unmarkSms.title')}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>{description}</p>
              <p>{t('billing.unmarkSms.appOnly')}</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('billing.unmarkSms.keep')}</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            {t('billing.unmarkSms.confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
