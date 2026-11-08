import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#/components/ui/tooltip'
import { useFormatters } from '#/i18n/use-locale'
import { cn } from '#/lib/utils'
import type { WeeklyCount } from '#/shared/dashboard/dashboard.dto'
import { addLocalDays } from '#/shared/time/local-date'

const CHART_HEIGHT = 160

/** Axis maximum and step: clean numbers, about four gridlines. */
function niceScale(max: number): { top: number; step: number } {
  if (max <= 0) return { top: 4, step: 1 }
  const raw = max / 4
  const magnitude = 10 ** Math.floor(Math.log10(raw))
  const step =
    [1, 2, 5, 10].map((m) => m * magnitude).find((s) => s >= raw) ??
    10 * magnitude
  return { top: Math.ceil(max / step) * step, step }
}

/**
 * Columns: done trainings per week. One series (no legend – the card title
 * names it); the week in progress uses a lighter step. Values are labelled
 * only on the current and the busiest week; every bar has a tooltip and links
 * to that week's trainings; the table below carries all values.
 */
export function WeeklyTrainingsChart({ weeks }: { weeks: Array<WeeklyCount> }) {
  const { t } = useTranslation()
  const format = useFormatters()
  const { top, step } = niceScale(Math.max(...weeks.map((w) => w.count)))
  const ticks = Array.from({ length: top / step + 1 }, (_, i) => i * step)
  const busiest = weeks.reduce(
    (best, w, i) => (w.count > weeks[best].count ? i : best),
    0,
  )
  const range = (w: WeeklyCount) =>
    `${format.shortLocalDate(w.weekStart)} – ${format.shortLocalDate(
      addLocalDays(w.weekStart, 6),
    )}`

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {/* Y axis */}
        <div
          className="text-muted-foreground relative w-6 shrink-0 text-right text-xs tabular-nums"
          style={{ height: CHART_HEIGHT }}
          aria-hidden
        >
          {ticks.map((tick) => (
            <span
              key={tick}
              className="absolute right-0 -translate-y-1/2"
              style={{ top: `${100 - (tick / top) * 100}%` }}
            >
              {tick}
            </span>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          {/* Plot */}
          <div className="relative" style={{ height: CHART_HEIGHT }}>
            {ticks.map((tick) => (
              <div
                key={tick}
                className={cn(
                  'absolute inset-x-0 h-px',
                  tick === 0 ? 'bg-border' : 'bg-viz-grid',
                )}
                style={{ top: `${100 - (tick / top) * 100}%` }}
                aria-hidden
              />
            ))}
            <div className="absolute inset-0 flex items-end">
              {weeks.map((week, i) => {
                const labelled = week.current || i === busiest
                const height = (week.count / top) * 100
                return (
                  <div
                    key={week.weekStart}
                    className="flex h-full flex-1 items-end justify-center"
                  >
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Link
                          to="/trainings"
                          search={{
                            from: week.weekStart,
                            to: addLocalDays(week.weekStart, 6),
                            sort: 'asc',
                          }}
                          className="group relative flex h-full w-full max-w-10 items-end justify-center rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                          aria-label={t('dashboard.weekly.barLabel', {
                            range: range(week),
                            count: week.count,
                          })}
                        >
                          {labelled && week.count > 0 && (
                            <span
                              className="text-muted-foreground absolute text-xs"
                              style={{ bottom: `calc(${height}% + 4px)` }}
                            >
                              {week.count}
                            </span>
                          )}
                          <span
                            className={cn(
                              'block w-full max-w-6 rounded-t-[4px] transition-opacity group-hover:opacity-80',
                              week.current
                                ? 'bg-viz-accent-muted'
                                : 'bg-viz-accent',
                            )}
                            style={{ height: `${height}%` }}
                          />
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-semibold">
                          {t('dashboard.weekly.trainings', {
                            count: week.count,
                          })}
                        </p>
                        <p className="opacity-80">
                          {range(week)}
                          {week.current &&
                            ` · ${t('dashboard.weekly.inProgress')}`}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                )
              })}
            </div>
          </div>

          {/* X axis */}
          <div className="text-muted-foreground mt-1 flex text-xs" aria-hidden>
            {weeks.map((week, i) => (
              <span
                key={week.weekStart}
                className={cn(
                  'flex-1 text-center tabular-nums',
                  // Every other label on narrow screens.
                  i % 2 === 1 && 'max-sm:invisible',
                )}
              >
                {format.shortLocalDate(week.weekStart)}
              </span>
            ))}
          </div>
        </div>
      </div>

      <details className="text-sm">
        <summary className="text-muted-foreground hover:text-foreground cursor-pointer">
          {t('dashboard.weekly.showTable')}
        </summary>
        <Table className="mt-2">
          <TableHeader>
            <TableRow>
              <TableHead>{t('dashboard.weekly.week')}</TableHead>
              <TableHead className="text-right">
                {t('dashboard.weekly.count')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {weeks.map((week) => (
              <TableRow key={week.weekStart}>
                <TableCell>
                  {range(week)}
                  {week.current && (
                    <span className="text-muted-foreground">
                      {' '}
                      · {t('dashboard.weekly.inProgress')}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {week.count}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </details>
    </div>
  )
}
