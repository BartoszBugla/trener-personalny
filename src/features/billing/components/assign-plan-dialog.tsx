import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '#/components/ui/button'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { useFormatters } from '#/i18n/use-locale'
import { PLAN_TYPES } from '#/shared/billing/billing.dto'
import type {
  PersonRef,
  PlanSummary,
  PlanType,
} from '#/shared/billing/billing.dto'
import {
  useAssignPlan,
  useCorrectPlan,
  useCreateFamilyGroup,
  useRemovePlan,
} from '../billing.queries'
import { todayLocal } from './format'

const NEW_GROUP = 'new'

export interface AssignPlanTarget {
  client: PersonRef
  currentPlan: PlanSummary | null
  /** Pre-selected plan type (e.g. the active pill). */
  planType?: PlanType
  /** Default start date, e.g. the client's first training. */
  suggestedFrom?: string | null
}

export function AssignPlanDialog({
  target,
  familyGroups,
  onOpenChange,
}: {
  target: AssignPlanTarget | null
  familyGroups: Array<PersonRef>
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={target !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        {target && (
          <AssignPlanForm
            key={target.client.id}
            target={target}
            familyGroups={familyGroups}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function AssignPlanForm({
  target,
  familyGroups,
  onDone,
}: {
  target: AssignPlanTarget
  familyGroups: Array<PersonRef>
  onDone: () => void
}) {
  const { t } = useTranslation()
  const format = useFormatters()
  const assign = useAssignPlan()
  const createGroup = useCreateFamilyGroup()
  const { client, currentPlan } = target

  const [planType, setPlanType] = useState<PlanType>(
    target.planType ?? 'trainings_4',
  )
  const [validFrom, setValidFrom] = useState(
    target.suggestedFrom ?? todayLocal(),
  )
  const [groupId, setGroupId] = useState<string>(
    familyGroups[0] ? String(familyGroups[0].id) : NEW_GROUP,
  )
  const [newGroupName, setNewGroupName] = useState('')

  const pending = assign.isPending || createGroup.isPending
  const tooEarly = currentPlan !== null && validFrom <= currentPlan.validFrom
  const needsGroupName =
    planType === 'family' && groupId === NEW_GROUP && !newGroupName.trim()

  const submit = async () => {
    let familyGroupId: number | undefined
    if (planType === 'family') {
      familyGroupId =
        groupId === NEW_GROUP
          ? (await createGroup.mutateAsync({ name: newGroupName.trim() })).id
          : Number(groupId)
    }
    await assign.mutateAsync({
      userId: client.id,
      planType,
      // The first plan covers all history – the server sets its start.
      validFrom: currentPlan ? validFrom : undefined,
      familyGroupId,
    })
    onDone()
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {currentPlan
            ? t('billing.assign.changeTitle', { name: client.name })
            : t('billing.assign.assignTitle', { name: client.name })}
        </DialogTitle>
        <DialogDescription>
          {currentPlan
            ? t('billing.assign.currently', {
                plan: t(`billing.plans.${currentPlan.planType}`),
                group: currentPlan.familyGroup
                  ? ` (${currentPlan.familyGroup.name})`
                  : '',
                since: currentPlan.coversHistory
                  ? t('billing.wholeHistory').toLowerCase()
                  : format.localDate(currentPlan.validFrom),
              })
            : t('billing.assign.firstPlan')}
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4">
        <div className="space-y-1">
          <Label htmlFor="plan-type">{t('billing.assign.plan')}</Label>
          <Select
            value={planType}
            onValueChange={(v) => setPlanType(v as PlanType)}
          >
            <SelectTrigger id="plan-type" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PLAN_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {t(`billing.plans.${type}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {planType === 'family' && (
          <div className="space-y-1">
            <Label htmlFor="family-group">
              {t('billing.assign.familyGroup')}
            </Label>
            <Select value={groupId} onValueChange={setGroupId}>
              <SelectTrigger id="family-group" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {familyGroups.map((g) => (
                  <SelectItem key={g.id} value={String(g.id)}>
                    {g.name}
                  </SelectItem>
                ))}
                <SelectItem value={NEW_GROUP}>
                  {t('billing.assign.newGroup')}
                </SelectItem>
              </SelectContent>
            </Select>
            {groupId === NEW_GROUP && (
              <Input
                placeholder={t('billing.assign.newGroupPlaceholder')}
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                aria-label={t('billing.assign.newGroupName')}
              />
            )}
          </div>
        )}

        {currentPlan ? (
          <div className="space-y-1">
            <Label htmlFor="valid-from">{t('billing.assign.from')}</Label>
            <Input
              id="valid-from"
              type="date"
              value={validFrom}
              onChange={(e) => setValidFrom(e.target.value)}
              aria-invalid={tooEarly}
            />
            {tooEarly && (
              <p className="text-destructive text-sm">
                {t('billing.assign.tooEarly', {
                  date: format.localDate(currentPlan.validFrom),
                })}
              </p>
            )}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            {target.suggestedFrom
              ? t('billing.assign.startsWithFirstTrainingOn', {
                  date: format.localDate(target.suggestedFrom),
                })
              : t('billing.assign.startsWithFirstTraining')}
          </p>
        )}
      </div>

      {currentPlan && <CorrectCurrentPlan plan={currentPlan} onDone={onDone} />}

      <DialogFooter>
        <Button variant="outline" onClick={onDone}>
          {t('common.cancel')}
        </Button>
        <Button
          disabled={
            pending ||
            (currentPlan !== null && !validFrom) ||
            tooEarly ||
            needsGroupName
          }
          onClick={() => void submit()}
        >
          {pending ? t('common.saving') : t('common.save')}
        </Button>
      </DialogFooter>
    </>
  )
}

/**
 * Fixing a mistake (wrong start date, wrong plan) without creating history –
 * only possible until a reminder SMS has been sent for the plan.
 */
function CorrectCurrentPlan({
  plan,
  onDone,
}: {
  plan: PlanSummary
  onDone: () => void
}) {
  const { t } = useTranslation()
  const correct = useCorrectPlan()
  const remove = useRemovePlan()
  const [validFrom, setValidFrom] = useState(plan.validFrom)
  const pending = correct.isPending || remove.isPending

  return (
    <details className="rounded-md border px-3 py-2 text-sm">
      <summary className="cursor-pointer font-medium">
        {t('billing.correct.title')}
      </summary>
      <p className="text-muted-foreground mt-2">
        {t('billing.correct.description')}
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        {!plan.coversHistory && (
          <>
            <div className="space-y-1">
              <Label htmlFor="correct-from">
                {t('billing.correct.startDate')}
              </Label>
              <Input
                id="correct-from"
                type="date"
                value={validFrom}
                onChange={(e) => setValidFrom(e.target.value)}
              />
            </div>
            <Button
              variant="secondary"
              disabled={pending || !validFrom || validFrom === plan.validFrom}
              onClick={async () => {
                await correct.mutateAsync({ planId: plan.id, validFrom })
                onDone()
              }}
            >
              {t('billing.correct.saveStartDate')}
            </Button>
          </>
        )}
        <Button
          variant="outline"
          className="text-destructive ml-auto"
          disabled={pending}
          onClick={async () => {
            await remove.mutateAsync(plan.id)
            onDone()
          }}
        >
          {t('billing.correct.remove')}
        </Button>
      </div>
    </details>
  )
}
