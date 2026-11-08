import { useMemo, useState } from 'react'
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { Separator } from '#/components/ui/separator'
import { Switch } from '#/components/ui/switch'
import type { Training } from '#/shared/trainings/trainings.dto'
import { normalizeName } from '#/shared/users/normalize-name'
import type { User } from '#/shared/users/users.dto'
import { CreateUserForm } from '../../users/components/create-user-form'
import { useAssignTrainingClient } from '../trainings.queries'
import { useFormatters } from '#/i18n/use-locale'

interface AssignClientDialogProps {
  training: Training | null
  users: Array<User>
  onOpenChange: (open: boolean) => void
}

export function AssignClientDialog({
  training,
  users,
  onOpenChange,
}: AssignClientDialogProps) {
  return (
    <Dialog open={training !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        {training && (
          <AssignClientContent
            // Reset local state when switching trainings.
            key={training.id}
            training={training}
            users={users}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function AssignClientContent({
  training,
  users,
  onDone,
}: {
  training: Training
  users: Array<User>
  onDone: () => void
}) {
  const assign = useAssignTrainingClient()
  const { t } = useTranslation()
  const format = useFormatters()
  const [clientId, setClientId] = useState<string>(
    training.client ? String(training.client.id) : '',
  )
  const [applyToSameName, setApplyToSameName] = useState(true)

  const { suggested, others } = useMemo(
    () =>
      rankCandidates(
        training.clientName ?? training.title,
        users,
        training.trainer.id,
      ),
    [training, users],
  )

  const submit = async (id: number) => {
    await assign.mutateAsync({
      trainingId: training.id,
      clientId: id,
      applyToSameName,
    })
    onDone()
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t('trainings.assign.title')}</DialogTitle>
        <DialogDescription>
          <Trans
            i18nKey="trainings.assign.description"
            values={{
              title: training.title,
              trainer: training.trainer.name,
              date: format.dateTime(training.startsAt),
            }}
            components={{ strong: <strong /> }}
          />
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-2">
        <Label htmlFor="assign-client">
          {t('trainings.assign.existingClient')}
        </Label>
        <Select value={clientId} onValueChange={setClientId}>
          <SelectTrigger id="assign-client" className="w-full">
            <SelectValue placeholder={t('trainings.assign.chooseUser')} />
          </SelectTrigger>
          <SelectContent>
            {suggested.length > 0 && (
              <SelectGroup>
                <SelectLabel>{t('trainings.assign.suggested')}</SelectLabel>
                {suggested.map((u) => (
                  <SelectItem key={u.id} value={String(u.id)}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            )}
            <SelectGroup>
              <SelectLabel>{t('trainings.assign.allUsers')}</SelectLabel>
              {others.map((u) => (
                <SelectItem key={u.id} value={String(u.id)}>
                  {u.name}
                  {u.isTrainer ? ` (${t('trainings.assign.trainer')})` : ''}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {training.clientName && (
        <div className="flex items-center gap-2">
          <Switch
            id="apply-same-name"
            checked={applyToSameName}
            onCheckedChange={setApplyToSameName}
          />
          <Label htmlFor="apply-same-name" className="font-normal">
            {t('trainings.assign.applyToSameName', {
              name: training.clientName,
            })}
          </Label>
        </div>
      )}

      <DialogFooter>
        <Button variant="outline" onClick={onDone}>
          {t('common.cancel')}
        </Button>
        <Button
          disabled={!clientId || assign.isPending}
          onClick={() => void submit(Number(clientId))}
        >
          {assign.isPending
            ? t('trainings.assign.assigning')
            : t('trainings.assign.submit')}
        </Button>
      </DialogFooter>

      <Separator />

      <div className="space-y-2">
        <p className="text-sm font-medium">{t('trainings.assign.orCreate')}</p>
        <CreateUserForm
          defaultName={training.clientName ?? ''}
          submitLabel={t('trainings.assign.createAndAssign')}
          onCreated={(user) => submit(user.id)}
        />
      </div>
    </>
  )
}

/**
 * Users whose name shares a word prefix with the calendar name come first
 * ("Ania" → "Anna Nowak"). The training's own trainer is excluded.
 */
function rankCandidates(name: string, users: Array<User>, trainerId: number) {
  const words = normalizeName(name)
    .split(' ')
    .filter((w) => w.length >= 2)
  const score = (u: User) => {
    const userWords = normalizeName(u.name).split(' ')
    return words.filter((w) =>
      userWords.some((uw) => uw === w || uw.startsWith(w.slice(0, 2))),
    ).length
  }
  const candidates = users.filter((u) => u.id !== trainerId)
  const suggested = candidates
    .map((u) => ({ u, s: score(u) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .map((x) => x.u)
  const suggestedIds = new Set(suggested.map((u) => u.id))
  return {
    suggested,
    others: candidates.filter((u) => !suggestedIds.has(u.id)),
  }
}
