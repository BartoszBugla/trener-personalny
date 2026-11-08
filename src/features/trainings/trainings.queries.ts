import {
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { userKeys } from '../users/users.queries'
import {
  assignTrainingClient,
  getTrainings,
  getTrainingsRange,
  ignoreTraining,
  importTrainings,
  restoreTraining,
  uploadTrainingsCalendars,
} from './trainings.functions'
import type {
  AssignClientDto,
  ImportSummary,
  IgnoreTrainingDto,
  ListTrainingsQuery,
  RestoreTrainingDto,
  TrainingsRangeQuery,
} from '#/shared/trainings/trainings.dto'

export const trainingKeys = {
  all: ['trainings'] as const,
  list: (query: ListTrainingsQuery) =>
    [...trainingKeys.all, 'list', query] as const,
  range: (query: TrainingsRangeQuery) =>
    [...trainingKeys.all, 'range', query] as const,
}

export const trainingsQueryOptions = (query: ListTrainingsQuery) =>
  queryOptions({
    queryKey: trainingKeys.list(query),
    queryFn: () => getTrainings({ data: query }),
  })

/** Toast + cache refresh after any calendar import. */
function useOnImported() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return (s: ImportSummary) => {
    toast.success(
      t('trainings.import.toast.title', {
        count: s.calendars,
        created: s.created,
        updated: s.updated,
      }),
      {
        description: [
          t('trainings.import.toast.cancelled', { count: s.cancelled }),
          s.ignored > 0
            ? t('trainings.import.toast.ignored', { count: s.ignored })
            : null,
          s.removed > 0
            ? t('trainings.import.toast.removed', { count: s.removed })
            : null,
          t('trainings.import.toast.skipped', { count: s.skipped }),
          t('trainings.import.toast.peopleCreated', {
            trainers: s.trainersCreated,
            clients: s.clientsCreated,
          }),
          s.unassigned > 0
            ? t('trainings.import.toast.unassigned', { count: s.unassigned })
            : null,
        ]
          .filter(Boolean)
          .join(' · '),
      },
    )
    return Promise.all([
      queryClient.invalidateQueries({ queryKey: trainingKeys.all }),
      queryClient.invalidateQueries({ queryKey: userKeys.all }),
    ])
  }
}

export const trainingsRangeQueryOptions = (query: TrainingsRangeQuery) =>
  queryOptions({
    queryKey: trainingKeys.range(query),
    queryFn: () => getTrainingsRange({ data: query }),
  })

export function useImportTrainings() {
  const onImported = useOnImported()
  return useMutation({
    mutationFn: () => importTrainings(),
    onSuccess: onImported,
    onError: (error) => toast.error(error.message),
  })
}

/** Imports uploaded .ics files; `data` is built by `UploadCalendarDialog`. */
export function useUploadTrainingsCalendars() {
  const onImported = useOnImported()
  return useMutation({
    mutationFn: (data: FormData) => uploadTrainingsCalendars({ data }),
    onSuccess: onImported,
    onError: (error) => toast.error(error.message),
  })
}

export function useAssignTrainingClient() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useMutation({
    mutationFn: (data: AssignClientDto) => assignTrainingClient({ data }),
    onSuccess: ({ updated }) => {
      toast.success(t('trainings.assign.toast', { count: updated }))
      return queryClient.invalidateQueries({ queryKey: trainingKeys.all })
    },
    onError: (error) => toast.error(error.message),
  })
}

export function useIgnoreTraining() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useMutation({
    mutationFn: (data: IgnoreTrainingDto) => ignoreTraining({ data }),
    onSuccess: ({ updated }) => {
      toast.success(t('trainings.ignore.toast', { count: updated }))
      return queryClient.invalidateQueries({ queryKey: trainingKeys.all })
    },
    onError: (error) => toast.error(error.message),
  })
}

export function useRestoreTraining() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useMutation({
    mutationFn: (data: RestoreTrainingDto) => restoreTraining({ data }),
    onSuccess: ({ updated }) => {
      toast.success(t('trainings.restore.toast', { count: updated }))
      return queryClient.invalidateQueries({ queryKey: trainingKeys.all })
    },
    onError: (error) => toast.error(error.message),
  })
}
