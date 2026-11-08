import {
  Link,
  createFileRoute,
  stripSearchParams,
} from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useCallback, useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { PaginationBar } from '#/components/pagination-bar'
import { Button } from '#/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { AssignClientDialog } from '#/features/trainings/components/assign-client-dialog'
import { IgnoreTrainingDialog } from '#/features/trainings/components/ignore-training-dialog'
import { ImportTrainingsButton } from '#/features/trainings/components/import-trainings-button'
import {
  TrainingFilters,
  hasActiveFilters,
} from '#/features/trainings/components/training-filters'
import { TrainingDetailsDialog } from '#/features/trainings/components/training-details-dialog'
import { TrainingTable } from '#/features/trainings/components/training-table'
import { UploadCalendarDialog } from '#/features/trainings/components/upload-calendar-dialog'
import {
  trainingsQueryOptions,
  useRestoreTraining,
} from '#/features/trainings/trainings.queries'
import { usersQueryOptions } from '#/features/users/users.queries'
import { DEFAULT_PAGE_SIZE, PAGE_SIZES } from '#/shared/list-query'
import type { SortDirection } from '#/shared/list-query'
import { listTrainingsSchema } from '#/shared/trainings/trainings.dto'
import type {
  ListTrainingsSearch,
  Training,
  TrainingSortField,
} from '#/shared/trainings/trainings.dto'
import { pageTitle } from '../__root'

/** Defaults are kept out of the URL (`/trainings` instead of `?page=1&…`). */
const SEARCH_DEFAULTS = {
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  status: 'active',
  sortBy: 'date',
  sort: 'desc',
} as const

/** First click on a column: newest dates first, text A→Z. */
const DEFAULT_SORT_DIRECTION: Record<TrainingSortField, SortDirection> = {
  date: 'desc',
  time: 'asc',
  trainer: 'asc',
  client: 'asc',
  status: 'asc',
  notes: 'asc',
}

export const Route = createFileRoute('/trainings/')({
  validateSearch: listTrainingsSchema,
  search: { middlewares: [stripSearchParams(SEARCH_DEFAULTS)] },
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    Promise.all([
      context.queryClient.ensureQueryData(trainingsQueryOptions(deps)),
      context.queryClient.ensureQueryData(usersQueryOptions()),
    ]),
  head: ({ match }) => ({
    meta: [{ title: pageTitle(match.context.locale, 'trainings.title') }],
  }),
  component: TrainingsPage,
})

function TrainingsPage() {
  const query = Route.useSearch()
  const navigate = Route.useNavigate()
  const { data } = useSuspenseQuery(trainingsQueryOptions(query))
  const { data: users } = useSuspenseQuery(usersQueryOptions())
  const restore = useRestoreTraining()
  const { t } = useTranslation()
  const [assigning, setAssigning] = useState<Training | null>(null)
  const [ignoring, setIgnoring] = useState<Training | null>(null)
  const [details, setDetails] = useState<Training | null>(null)

  /** Filter changes replace the history entry and start from page 1. */
  const setFilters = useCallback(
    (patch: Partial<ListTrainingsSearch>) =>
      void navigate({
        search: (prev) => ({ ...prev, ...patch, page: 1 }),
        replace: true,
        resetScroll: false,
      }),
    [navigate],
  )
  /** Page changes are history entries (back button returns to the page). */
  const setPage = (page: number) =>
    void navigate({ search: (prev) => ({ ...prev, page }) })

  const trainers = users.filter((u) => u.isTrainer)
  const filtered = hasActiveFilters(query)

  return (
    <Card className="mx-auto max-w-6xl">
      <CardHeader>
        <CardTitle>{t('trainings.title')}</CardTitle>
        <CardDescription>
          {t('trainings.description')}{' '}
          {data.unassignedTotal > 0 && (
            <>
              <span className="text-destructive font-medium">
                {t('trainings.unassignedCount', {
                  count: data.unassignedTotal,
                })}
              </span>{' '}
              {!query.unassigned && (
                <Button
                  variant="link"
                  className="h-auto p-0"
                  onClick={() => setFilters({ unassigned: true })}
                >
                  {t('trainings.showUnassigned')}
                </Button>
              )}
            </>
          )}
        </CardDescription>
        <CardAction className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link
              to="/trainings/calendar"
              search={{ trainerId: query.trainerId }}
            >
              <CalendarDays className="size-4" />
              {t('trainings.calendar.open')}
            </Link>
          </Button>
          <UploadCalendarDialog />
          <ImportTrainingsButton />
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        <TrainingFilters
          query={query}
          trainers={trainers}
          onChange={setFilters}
          onClear={() =>
            void navigate({ search: { pageSize: query.pageSize } })
          }
        />
        {data.total === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">
            {filtered ? t('trainings.noResults') : t('trainings.empty')}
          </p>
        ) : (
          <>
            <TrainingTable
              trainings={data.items}
              sortBy={query.sortBy}
              sort={query.sort}
              onSort={(field) =>
                setFilters({
                  sortBy: field,
                  sort:
                    field === query.sortBy
                      ? query.sort === 'asc'
                        ? 'desc'
                        : 'asc'
                      : DEFAULT_SORT_DIRECTION[field],
                })
              }
              onAssign={setAssigning}
              onIgnore={setIgnoring}
              onShowDetails={setDetails}
              onRestore={(training) =>
                restore.mutate({ trainingId: training.id })
              }
              busy={restore.isPending}
            />
            <PaginationBar
              page={data.page}
              pageCount={data.pageCount}
              pageSize={data.pageSize}
              total={data.total}
              pageSizes={PAGE_SIZES}
              onPageChange={setPage}
              onPageSizeChange={(pageSize) => setFilters({ pageSize })}
            />
          </>
        )}
      </CardContent>
      <AssignClientDialog
        training={assigning}
        users={users}
        onOpenChange={(open) => !open && setAssigning(null)}
      />
      <TrainingDetailsDialog
        training={details}
        onOpenChange={(open) => !open && setDetails(null)}
        onAssign={(training) => {
          setDetails(null)
          setAssigning(training)
        }}
        onIgnore={(training) => {
          setDetails(null)
          setIgnoring(training)
        }}
      />
      <IgnoreTrainingDialog
        training={ignoring}
        onOpenChange={(open) => !open && setIgnoring(null)}
      />
    </Card>
  )
}
