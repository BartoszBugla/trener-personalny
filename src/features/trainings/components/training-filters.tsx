import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { SearchInput } from '#/components/search-input'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { Switch } from '#/components/ui/switch'
import { TRAINING_STATUS_FILTERS } from '#/shared/trainings/trainings.dto'
import type {
  ListTrainingsQuery,
  ListTrainingsSearch,
  TrainingStatusFilter,
} from '#/shared/trainings/trainings.dto'
import type { User } from '#/shared/users/users.dto'

const ALL_TRAINERS = 'all'

interface TrainingFiltersProps {
  query: ListTrainingsQuery
  trainers: Array<User>
  /** Applies a filter change (the page resets to 1). */
  onChange: (patch: Partial<ListTrainingsSearch>) => void
  onClear: () => void
}

/** True when any filter differs from the defaults (pagination excluded). */
export function hasActiveFilters(query: ListTrainingsQuery): boolean {
  return Boolean(
    query.q ||
    query.trainerId ||
    query.unassigned ||
    query.from ||
    query.to ||
    query.status !== 'active',
  )
}

export function TrainingFilters({
  query,
  trainers,
  onChange,
  onClear,
}: TrainingFiltersProps) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-wrap items-end gap-3">
      <SearchInput
        value={query.q ?? ''}
        onChange={(q) => onChange({ q })}
        placeholder={t('trainings.filters.search')}
      />

      {trainers.length > 1 && (
        <Field label={t('trainings.filters.trainer')} htmlFor="filter-trainer">
          <Select
            value={query.trainerId ? String(query.trainerId) : ALL_TRAINERS}
            onValueChange={(value) =>
              onChange({
                trainerId: value === ALL_TRAINERS ? undefined : Number(value),
              })
            }
          >
            <SelectTrigger id="filter-trainer" className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_TRAINERS}>
                {t('trainings.filters.allTrainers')}
              </SelectItem>
              {trainers.map((trainer) => (
                <SelectItem key={trainer.id} value={String(trainer.id)}>
                  {trainer.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}

      <Field label={t('trainings.filters.status')} htmlFor="filter-status">
        <Select
          value={query.status}
          onValueChange={(value) =>
            onChange({ status: value as TrainingStatusFilter })
          }
        >
          <SelectTrigger id="filter-status" className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TRAINING_STATUS_FILTERS.map((status) => (
              <SelectItem key={status} value={status}>
                {t(`trainings.filters.statuses.${status}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label={t('trainings.filters.from')} htmlFor="filter-from">
        <Input
          id="filter-from"
          type="date"
          className="w-40"
          value={query.from ?? ''}
          max={query.to}
          onChange={(e) => onChange({ from: e.target.value || undefined })}
        />
      </Field>
      <Field label={t('trainings.filters.to')} htmlFor="filter-to">
        <Input
          id="filter-to"
          type="date"
          className="w-40"
          value={query.to ?? ''}
          min={query.from}
          onChange={(e) => onChange({ to: e.target.value || undefined })}
        />
      </Field>

      <div className="flex h-9 items-center gap-2">
        <Switch
          id="only-unassigned"
          checked={query.unassigned ?? false}
          onCheckedChange={(checked) =>
            onChange({ unassigned: checked || undefined })
          }
        />
        <Label htmlFor="only-unassigned">
          {t('trainings.filters.onlyUnassigned')}
        </Label>
      </div>

      {hasActiveFilters(query) && (
        <Button variant="ghost" onClick={onClear}>
          <X className="size-4" />
          {t('trainings.filters.clear')}
        </Button>
      )}
    </div>
  )
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={htmlFor} className="text-muted-foreground text-xs">
        {label}
      </Label>
      {children}
    </div>
  )
}
