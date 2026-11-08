import { EyeOff, UserPlus } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { useFormatters } from '#/i18n/use-locale'
import { htmlToText } from '#/shared/trainings/html-to-text'
import type { Training } from '#/shared/trainings/trainings.dto'

/** Full details of a calendar event: title, people, location and notes. */
export function TrainingDetailsDialog({
  training,
  onOpenChange,
  onAssign,
  onIgnore,
}: {
  training: Training | null
  onOpenChange: (open: boolean) => void
  onAssign: (training: Training) => void
  onIgnore: (training: Training) => void
}) {
  const { t } = useTranslation()
  const format = useFormatters()

  if (!training) {
    return <Dialog open={false} onOpenChange={onOpenChange} />
  }

  const inSchedule =
    training.status === 'confirmed' || training.status === 'cancelled'
  const notes = training.notes ? htmlToText(training.notes) : ''

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="pr-6 break-words">
            {training.title}
          </DialogTitle>
          <DialogDescription>
            {format.weekdayDate(training.startsAt)},{' '}
            {format.time(training.startsAt)}–{format.time(training.endsAt)}
          </DialogDescription>
        </DialogHeader>

        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-muted-foreground">
            {t('trainings.table.trainer')}
          </dt>
          <dd>{training.trainer.name}</dd>
          <dt className="text-muted-foreground">
            {t('trainings.table.client')}
          </dt>
          <dd>
            {training.client ? (
              training.client.name
            ) : (
              <span className="text-destructive">
                {t('trainings.details.noClient', {
                  name: training.clientName ?? '—',
                })}
              </span>
            )}
          </dd>
          <dt className="text-muted-foreground">
            {t('trainings.table.status')}
          </dt>
          <dd>
            <Badge
              variant={
                training.status === 'confirmed' ? 'secondary' : 'outline'
              }
            >
              {t(`trainings.status.${training.status}`)}
            </Badge>
          </dd>
          {training.location && (
            <>
              <dt className="text-muted-foreground">
                {t('trainings.details.location')}
              </dt>
              <dd className="break-words">{training.location}</dd>
            </>
          )}
        </dl>

        <section className="space-y-1">
          <h3 className="text-sm font-medium">{t('trainings.table.notes')}</h3>
          {notes ? (
            <p className="bg-muted max-h-80 overflow-y-auto rounded-md p-3 text-sm break-words whitespace-pre-wrap">
              {notes}
            </p>
          ) : (
            <p className="text-muted-foreground text-sm">
              {t('trainings.details.noNotes')}
            </p>
          )}
        </section>

        {inSchedule && (
          <DialogFooter>
            <Button variant="outline" onClick={() => onIgnore(training)}>
              <EyeOff className="size-4" />
              {t('trainings.ignore.action')}
            </Button>
            <Button onClick={() => onAssign(training)}>
              <UserPlus className="size-4" />
              {training.client
                ? t('trainings.details.changeClient')
                : t('trainings.assign.title')}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
