import {
  ClientOnly,
  Link,
  createFileRoute,
  stripSearchParams,
} from '@tanstack/react-router'
import {
  keepPreviousData,
  useQuery,
  useSuspenseQuery,
} from '@tanstack/react-query'
import { List } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '#/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { Label } from '#/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { Skeleton } from '#/components/ui/skeleton'
import { Switch } from '#/components/ui/switch'
import { AssignClientDialog } from '#/features/trainings/components/assign-client-dialog'
import { IgnoreTrainingDialog } from '#/features/trainings/components/ignore-training-dialog'
import { TrainingDetailsDialog } from '#/features/trainings/components/training-details-dialog'
import {
  TrainingsCalendar,
  trainerColor,
} from '#/features/trainings/components/trainings-calendar'
import type { CalendarRange } from '#/features/trainings/components/trainings-calendar'
import { trainingsRangeQueryOptions } from '#/features/trainings/trainings.queries'
import { usersQueryOptions } from '#/features/users/users.queries'
import { trainingsCalendarSearchSchema } from '#/shared/trainings/trainings.dto'
import type {
  Training,
  TrainingsCalendarSearch,
} from '#/shared/trainings/trainings.dto'
import { pageTitle } from '../__root'

const ALL_TRAINERS = 'all'
const DAY_MS = 86_400_000

export const Route = createFileRoute('/trainings/calendar')({
  validateSearch: trainingsCalendarSearchSchema,
  search: { middlewares: [stripSearchParams({ view: 'dayGridMonth' })] },
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(usersQueryOptions()),
  head: ({ match }) => ({
    meta: [
      { title: pageTitle(match.context.locale, 'trainings.calendar.title') },
    ],
  }),
  component: TrainingsCalendarPage,
})

function TrainingsCalendarPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const { t } = useTranslation()
  const { data: users } = useSuspenseQuery(usersQueryOptions())
  const [range, setRange] = useState<{ from: string; to: string } | null>(null)
  const [details, setDetails] = useState<Training | null>(null)
  const [assigning, setAssigning] = useState<Training | null>(null)
  const [ignoring, setIgnoring] = useState<Training | null>(null)

  const trainers = useMemo(() => users.filter((u) => u.isTrainer), [users])
  const trainerIds = useMemo(() => trainers.map((u) => u.id), [trainers])

  const { data, isFetching } = useQuery({
    ...trainingsRangeQueryOptions({
      from: range?.from ?? '',
      to: range?.to ?? '',
      trainerId: search.trainerId,
      includeHidden: search.includeHidden ?? false,
    }),
    enabled: range !== null,
    placeholderData: keepPreviousData,
  })

  const setSearch = useCallback(
    (patch: Partial<TrainingsCalendarSearch>) =>
      void navigate({
        search: (prev) => ({ ...prev, ...patch }),
        replace: true,
        resetScroll: false,
      }),
    [navigate],
  )

  const onRangeChange = useCallback(
    ({ view, date, start, end }: CalendarRange) => {
      // A day of margin on both sides: event times are compared as instants.
      setRange({
        from: new Date(start.getTime() - DAY_MS).toISOString(),
        to: new Date(end.getTime() + DAY_MS).toISOString(),
      })
      if (view !== search.view || date !== search.date) {
        setSearch({ view, date })
      }
    },
    [search.view, search.date, setSearch],
  )

  return (
    <Card className="mx-auto max-w-6xl">
      <CardHeader>
        <CardTitle>{t('trainings.calendar.title')}</CardTitle>
        <CardDescription>{t('trainings.calendar.description')}</CardDescription>
        <CardAction>
          <Button variant="outline" asChild>
            <Link to="/trainings" search={{ trainerId: search.trainerId }}>
              <List className="size-4" />
              {t('trainings.calendar.list')}
            </Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
          {trainers.length > 1 && (
            <div className="grid gap-1.5">
              <Label htmlFor="calendar-trainer">
                {t('trainings.filters.trainer')}
              </Label>
              <Select
                value={
                  search.trainerId ? String(search.trainerId) : ALL_TRAINERS
                }
                onValueChange={(value) =>
                  setSearch({
                    trainerId:
                      value === ALL_TRAINERS ? undefined : Number(value),
                  })
                }
              >
                <SelectTrigger id="calendar-trainer" className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_TRAINERS}>
                    {t('trainings.filters.allTrainers')}
                  </SelectItem>
                  {trainers.map((trainer) => (
                    <SelectItem key={trainer.id} value={String(trainer.id)}>
                      <span
                        aria-hidden
                        className="size-2.5 rounded-full"
                        style={{
                          backgroundColor: trainerColor(trainerIds, trainer.id),
                        }}
                      />
                      {trainer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex h-9 items-center gap-2">
            <Switch
              id="calendar-hidden"
              checked={search.includeHidden ?? false}
              onCheckedChange={(checked) =>
                setSearch({ includeHidden: checked || undefined })
              }
            />
            <Label htmlFor="calendar-hidden">
              {t('trainings.calendar.showHidden')}
            </Label>
          </div>
        </div>

        <ClientOnly fallback={<Skeleton className="h-[720px] w-full" />}>
          <TrainingsCalendar
            trainings={data ?? []}
            trainerIds={trainerIds}
            view={search.view}
            date={search.date}
            loading={isFetching}
            onRangeChange={onRangeChange}
            onSelect={setDetails}
          />
        </ClientOnly>
      </CardContent>

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
      <AssignClientDialog
        training={assigning}
        users={users}
        onOpenChange={(open) => !open && setAssigning(null)}
      />
      <IgnoreTrainingDialog
        training={ignoring}
        onOpenChange={(open) => !open && setIgnoring(null)}
      />
    </Card>
  )
}
