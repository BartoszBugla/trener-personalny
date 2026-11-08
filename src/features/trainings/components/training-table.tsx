import { AlertTriangle, EyeOff, Info, StickyNote, Undo2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Badge } from '#/components/ui/badge'
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
import { htmlToText } from '#/shared/trainings/html-to-text'
import { cn } from '#/lib/utils'
import { SortableHead } from '#/components/sortable-head'
import type { SortDirection } from '#/shared/list-query'
import type {
  Training,
  TrainingSortField,
} from '#/shared/trainings/trainings.dto'

interface TrainingTableProps {
  trainings: Array<Training>
  onAssign: (training: Training) => void
  onIgnore: (training: Training) => void
  onShowDetails: (training: Training) => void
  onRestore: (training: Training) => void
  /** Disables row actions while a mutation runs. */
  busy?: boolean
  sortBy: TrainingSortField
  sort: SortDirection
  onSort: (field: TrainingSortField) => void
}

export function TrainingTable({
  trainings,
  onAssign,
  onIgnore,
  onShowDetails,
  onRestore,
  busy = false,
  sortBy,
  sort,
  onSort,
}: TrainingTableProps) {
  const { t } = useTranslation()
  const format = useFormatters()
  const header = (field: TrainingSortField) => (
    <SortableHead
      label={t(`trainings.table.${field}`)}
      direction={sortBy === field ? sort : null}
      onClick={() => onSort(field)}
    />
  )

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {header('date')}
          {header('time')}
          {header('trainer')}
          {header('client')}
          {header('status')}
          {header('notes')}
          <TableHead className="w-0">
            <span className="sr-only">{t('trainings.table.actions')}</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {trainings.map((training) => {
          const client = training.client
          const inSchedule =
            training.status === 'confirmed' || training.status === 'cancelled'
          const unassigned = client === null && inSchedule
          return (
            <TableRow
              key={training.id}
              className={cn(
                unassigned && 'bg-destructive/10 hover:bg-destructive/15',
                training.status === 'cancelled' && 'text-muted-foreground',
                training.status === 'removed' &&
                  'text-muted-foreground line-through',
                training.status === 'ignored' && 'text-muted-foreground',
              )}
            >
              <TableCell className="whitespace-nowrap">
                {format.weekdayDate(training.startsAt)}
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {format.time(training.startsAt)}–{format.time(training.endsAt)}
              </TableCell>
              <TableCell>{training.trainer.name}</TableCell>
              <TableCell>
                {!inSchedule ? (
                  <span title={training.title}>
                    {client?.name ?? training.title}
                  </span>
                ) : client === null ? (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => onAssign(training)}
                    title={t('trainings.table.calendarTitle', {
                      title: training.title,
                    })}
                  >
                    <AlertTriangle className="size-4" />
                    {t('trainings.table.assign', {
                      name: training.clientName ?? training.title,
                    })}
                  </Button>
                ) : (
                  <button
                    type="button"
                    className="hover:underline"
                    onClick={() => onAssign(training)}
                    title={t('trainings.table.clickToChange', {
                      title: training.title,
                    })}
                  >
                    {client.name}
                  </button>
                )}
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    training.status === 'confirmed' ? 'secondary' : 'outline'
                  }
                  title={
                    training.status === 'removed'
                      ? t('trainings.status.removedHint')
                      : training.status === 'ignored'
                        ? t('trainings.status.ignoredHint')
                        : undefined
                  }
                >
                  {t(`trainings.status.${training.status}`)}
                </Badge>
              </TableCell>
              <TableCell className="max-w-64 text-sm">
                {training.notes && (
                  <button
                    type="button"
                    className="group flex w-full items-center gap-1.5 text-left"
                    onClick={() => onShowDetails(training)}
                    title={t('trainings.details.show')}
                  >
                    <StickyNote
                      className="size-4 shrink-0 text-amber-500 dark:text-amber-400"
                      aria-label={t('trainings.table.hasNotes')}
                    />
                    <span className="text-muted-foreground group-hover:text-foreground truncate group-hover:underline">
                      {htmlToText(training.notes)}
                    </span>
                  </button>
                )}
              </TableCell>
              <TableCell className="text-right whitespace-nowrap">
                <Button
                  size="icon-sm"
                  variant="ghost"
                  className="relative"
                  onClick={() => onShowDetails(training)}
                  title={
                    training.notes
                      ? t('trainings.table.showNotes')
                      : t('trainings.details.show')
                  }
                  aria-label={
                    training.notes
                      ? t('trainings.table.showNotes')
                      : t('trainings.details.show')
                  }
                >
                  <Info />
                  {training.notes && (
                    <span className="absolute top-1 right-1 size-2 rounded-full bg-amber-500 dark:bg-amber-400" />
                  )}
                </Button>
                {inSchedule && (
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => onIgnore(training)}
                    title={t('trainings.ignore.action')}
                    aria-label={t('trainings.ignore.action')}
                  >
                    <EyeOff />
                  </Button>
                )}
                {training.status === 'ignored' && (
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => onRestore(training)}
                    title={t('trainings.restore.action')}
                    aria-label={t('trainings.restore.action')}
                  >
                    <Undo2 />
                  </Button>
                )}
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
