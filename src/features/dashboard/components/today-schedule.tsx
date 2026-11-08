import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { Badge } from '#/components/ui/badge'
import { useFormatters } from '#/i18n/use-locale'
import { cn } from '#/lib/utils'
import type { Training } from '#/shared/trainings/trainings.dto'

/** Today's trainings in time order; past ones dimmed. */
export function TodaySchedule({
  trainings,
  today,
  now,
}: {
  trainings: Array<Training>
  today: string
  now: number
}) {
  const { t } = useTranslation()
  const format = useFormatters()

  return (
    <div className="space-y-3">
      {trainings.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {t('dashboard.today.empty')}
        </p>
      ) : (
        <ul className="divide-y">
          {trainings.map((training) => {
            const past = new Date(training.endsAt).getTime() < now
            return (
              <li
                key={training.id}
                className={cn(
                  'flex items-center gap-3 py-2 text-sm',
                  past && 'text-muted-foreground',
                )}
              >
                <span className="w-24 shrink-0 tabular-nums">
                  {format.time(training.startsAt)}–
                  {format.time(training.endsAt)}
                </span>
                <span
                  className={cn(
                    'min-w-0 flex-1 truncate',
                    !training.client && 'text-destructive',
                  )}
                  title={training.title}
                >
                  {training.client?.name ??
                    training.clientName ??
                    training.title}
                </span>
                {training.status === 'cancelled' && (
                  <Badge variant="outline">
                    {t('trainings.status.cancelled')}
                  </Badge>
                )}
              </li>
            )
          })}
        </ul>
      )}
      <Link
        to="/trainings"
        search={{ from: today, to: today, sort: 'asc' }}
        className="text-muted-foreground hover:text-foreground inline-block text-xs hover:underline"
      >
        {t('dashboard.today.open')}
      </Link>
    </div>
  )
}
