import { useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'

import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Label } from '#/components/ui/label'
import { Switch } from '#/components/ui/switch'
import { useFormatters } from '#/i18n/use-locale'
import type { Training } from '#/shared/trainings/trainings.dto'
import { useIgnoreTraining } from '../trainings.queries'

/** Confirms marking a calendar event as "not a training". */
export function IgnoreTrainingDialog({
  training,
  onOpenChange,
}: {
  training: Training | null
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={training !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        {training && (
          <IgnoreTrainingContent
            key={training.id}
            training={training}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function IgnoreTrainingContent({
  training,
  onDone,
}: {
  training: Training
  onDone: () => void
}) {
  const { t } = useTranslation()
  const format = useFormatters()
  const ignore = useIgnoreTraining()
  const [applyToSameTitle, setApplyToSameTitle] = useState(true)

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t('trainings.ignore.title')}</DialogTitle>
        <DialogDescription>
          <Trans
            i18nKey="trainings.ignore.description"
            values={{
              title: training.title,
              date: format.weekdayDate(training.startsAt),
            }}
            components={{ strong: <strong /> }}
          />
        </DialogDescription>
      </DialogHeader>
      <div className="flex items-start gap-3">
        <Switch
          id="ignore-same-title"
          checked={applyToSameTitle}
          onCheckedChange={setApplyToSameTitle}
        />
        <Label htmlFor="ignore-same-title" className="leading-snug">
          {t('trainings.ignore.applyToSameTitle', { title: training.title })}
        </Label>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onDone}>
          {t('common.cancel')}
        </Button>
        <Button
          disabled={ignore.isPending}
          onClick={async () => {
            await ignore.mutateAsync({
              trainingId: training.id,
              applyToSameTitle,
            })
            onDone()
          }}
        >
          {ignore.isPending
            ? t('trainings.ignore.pending')
            : t('trainings.ignore.submit')}
        </Button>
      </DialogFooter>
    </>
  )
}
