import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { StatTile } from '#/features/dashboard/components/stat-tile'
import type { StatDelta } from '#/features/dashboard/components/stat-tile'
import { TodaySchedule } from '#/features/dashboard/components/today-schedule'
import { TodoList } from '#/features/dashboard/components/todo-list'
import { TopClients } from '#/features/dashboard/components/top-clients'
import { WeeklyTrainingsChart } from '#/features/dashboard/components/weekly-trainings-chart'
import { dashboardQueryOptions } from '#/features/dashboard/dashboard.queries'
import { useFormatters } from '#/i18n/use-locale'
import type { Comparison } from '#/shared/dashboard/dashboard.dto'
import { pageTitle } from './__root'

export const Route = createFileRoute('/')({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData({
      ...dashboardQueryOptions(),
      // Always fresh when coming back to the dashboard.
      revalidateIfStale: true,
    }),
  head: ({ match }) => ({
    meta: [{ title: pageTitle(match.context.locale, 'dashboard.title') }],
  }),
  component: Dashboard,
})

function Dashboard() {
  const { data } = useSuspenseQuery(dashboardQueryOptions())
  const { t } = useTranslation()
  const format = useFormatters()

  const countDelta = (
    { current, previous }: Comparison,
    period: 'week' | 'month' | 'rolling',
  ): StatDelta => ({
    value: current - previous,
    text: t(`dashboard.delta.${period}`, {
      value: format.signed(current - previous),
    }),
    upIsGood: true,
  })

  const { current: rate, previous: previousRate } = data.cancellationRate
  const rateDelta: StatDelta | undefined =
    rate !== null && previousRate !== null
      ? {
          value: Math.round((rate - previousRate) * 1000) / 10,
          text: t('dashboard.delta.rollingPoints', {
            value: format.signed(Math.round((rate - previousRate) * 1000) / 10),
          }),
          upIsGood: false,
        }
      : undefined

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t('dashboard.title')}
        </h1>
        <p className="text-muted-foreground text-sm">
          {t('dashboard.subtitle', {
            date: format.weekdayDate(data.generatedAt),
          })}
        </p>
      </header>

      <section
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        aria-label={t('dashboard.kpis')}
      >
        <StatTile
          label={t('dashboard.stats.week')}
          value={String(data.week.current)}
          delta={countDelta(data.week, 'week')}
          hint={t('dashboard.stats.planned', { count: data.week.planned })}
        />
        <StatTile
          label={t('dashboard.stats.month')}
          value={String(data.month.current)}
          delta={countDelta(data.month, 'month')}
          hint={t('dashboard.stats.planned', { count: data.month.planned })}
        />
        <StatTile
          label={t('dashboard.stats.activeClients')}
          value={String(data.activeClients.current)}
          delta={countDelta(data.activeClients, 'rolling')}
          hint={t('dashboard.stats.last30Days')}
        />
        <StatTile
          label={t('dashboard.stats.cancellations')}
          value={rate === null ? '—' : format.percent(rate)}
          delta={rateDelta}
          hint={t('dashboard.stats.last30Days')}
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t('dashboard.weekly.title')}</CardTitle>
            <CardDescription>
              {t('dashboard.weekly.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <WeeklyTrainingsChart weeks={data.weekly} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.todo.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <TodoList todo={data.todo} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t('dashboard.today.title')}</CardTitle>
            <CardDescription>
              {t('dashboard.today.description', {
                count: data.todayTrainings.length,
              })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TodaySchedule
              trainings={data.todayTrainings}
              today={data.today}
              now={new Date(data.generatedAt).getTime()}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.topClients.title')}</CardTitle>
            <CardDescription>{t('dashboard.stats.last30Days')}</CardDescription>
          </CardHeader>
          <CardContent>
            <TopClients clients={data.topClients} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
