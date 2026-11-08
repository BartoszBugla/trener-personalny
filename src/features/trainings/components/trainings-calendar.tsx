import type {
  DatesSetArg,
  EventClickArg,
  EventContentArg,
  EventInput,
} from '@fullcalendar/core'
import enGbLocale from '@fullcalendar/core/locales/en-gb'
import plLocale from '@fullcalendar/core/locales/pl'
import dayGridPlugin from '@fullcalendar/daygrid'
import listPlugin from '@fullcalendar/list'
import luxonPlugin from '@fullcalendar/luxon3'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '#/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { useLocale } from '#/i18n/use-locale'
import { cn } from '#/lib/utils'
import { BUSINESS_TIME_ZONE, toLocalDate } from '#/shared/time/local-date'
import { CALENDAR_VIEWS } from '#/shared/trainings/trainings.dto'
import type { CalendarView, Training } from '#/shared/trainings/trainings.dto'

const PLUGINS = [dayGridPlugin, timeGridPlugin, listPlugin, luxonPlugin]
const LOCALES = { pl: plLocale, en: enGbLocale } as const

/** Readable with white text in light and dark mode. */
const TRAINER_COLORS = [
  '#2563eb',
  '#16a34a',
  '#d97706',
  '#9333ea',
  '#db2777',
  '#0891b2',
  '#dc2626',
  '#4f46e5',
]

/** What the calendar currently shows (from FullCalendar's `datesSet`). */
export interface CalendarRange {
  view: CalendarView
  /** Local date of the first day of the view. */
  date: string
  /** Instants bounding the visible range (end exclusive). */
  start: Date
  end: Date
}

/** Stable color per trainer (by position among all trainers). */
export function trainerColor(trainerIds: Array<number>, trainerId: number) {
  const index = trainerIds.indexOf(trainerId)
  return TRAINER_COLORS[
    (index === -1 ? trainerId : index) % TRAINER_COLORS.length
  ]
}

export function TrainingsCalendar({
  trainings,
  trainerIds,
  view,
  date,
  loading,
  onRangeChange,
  onSelect,
}: {
  trainings: Array<Training>
  /** All trainer ids, for stable colors. */
  trainerIds: Array<number>
  view: CalendarView
  date: string | undefined
  loading: boolean
  onRangeChange: (range: CalendarRange) => void
  onSelect: (training: Training) => void
}) {
  const { t } = useTranslation()
  const { locale } = useLocale()
  const calendarRef = useRef<FullCalendar>(null)
  const [title, setTitle] = useState('')

  const api = () => calendarRef.current?.getApi()

  // Follow URL changes (back/forward, links) that the calendar didn't cause.
  useEffect(() => {
    const calendar = calendarRef.current?.getApi()
    if (!calendar) return
    if (calendar.view.type !== view) {
      calendar.changeView(view, date)
      return
    }
    if (date) {
      const shown = toLocalDate(calendar.view.currentStart)
      const end = toLocalDate(calendar.view.currentEnd)
      if (date < shown || date >= end) calendar.gotoDate(date)
    }
  }, [view, date])

  const events = useMemo<Array<EventInput>>(
    () =>
      trainings.map((training) => {
        const hidden =
          training.status === 'removed' || training.status === 'ignored'
        const color = trainerColor(trainerIds, training.trainer.id)
        return {
          id: String(training.id),
          start: training.startsAt,
          end: training.endsAt,
          title: labelOf(training),
          backgroundColor: color,
          borderColor: training.client
            ? color
            : 'var(--destructive-foreground)',
          textColor: '#fff',
          classNames: cn(
            training.status === 'cancelled' && 'line-through opacity-60',
            hidden && 'opacity-40',
            !training.client && !hidden && 'border-2! border-dashed!',
          )
            .split(' ')
            .filter(Boolean),
          extendedProps: { training },
        }
      }),
    [trainings, trainerIds],
  )

  const handleDatesSet = (arg: DatesSetArg) => {
    setTitle(arg.view.title)
    onRangeChange({
      view: arg.view.type as CalendarView,
      date: toLocalDate(arg.view.currentStart),
      start: arg.start,
      end: arg.end,
    })
  }

  const isTimeGrid = view.startsWith('timeGrid')

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            aria-label={t('trainings.calendar.previous')}
            onClick={() => api()?.prev()}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label={t('trainings.calendar.next')}
            onClick={() => api()?.next()}
          >
            <ChevronRight className="size-4" />
          </Button>
          <Button variant="outline" onClick={() => api()?.today()}>
            {t('trainings.calendar.today')}
          </Button>
        </div>
        <h2
          className={cn(
            'min-w-0 flex-1 text-lg font-semibold capitalize',
            loading && 'text-muted-foreground',
          )}
          aria-live="polite"
        >
          {title}
        </h2>
        <Tabs value={view} onValueChange={(value) => api()?.changeView(value)}>
          <TabsList>
            {CALENDAR_VIEWS.map((v) => (
              <TabsTrigger key={v} value={v}>
                {t(`trainings.calendar.views.${v}`)}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <FullCalendar
        ref={calendarRef}
        plugins={PLUGINS}
        initialView={view}
        initialDate={date}
        timeZone={BUSINESS_TIME_ZONE}
        locale={LOCALES[locale]}
        headerToolbar={false}
        height={isTimeGrid ? 720 : 'auto'}
        scrollTime="06:00:00"
        allDaySlot={false}
        nowIndicator
        navLinks
        dayMaxEventRows={4}
        eventDisplay="block"
        eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
        events={events}
        datesSet={handleDatesSet}
        eventClick={(arg: EventClickArg) =>
          onSelect(arg.event.extendedProps.training as Training)
        }
        eventContent={renderEventContent}
      />
    </div>
  )
}

function renderEventContent(arg: EventContentArg) {
  const view = arg.view.type as CalendarView
  const training = arg.event.extendedProps.training as Training
  if (view === 'listWeek') {
    // The list has its own time column.
    return (
      <span>
        {arg.event.title}{' '}
        <span className="text-muted-foreground">· {training.trainer.name}</span>
      </span>
    )
  }
  const showTrainer = view !== 'dayGridMonth'
  return (
    <div
      className="min-w-0 overflow-hidden px-1 text-xs leading-tight"
      title={`${arg.timeText} ${arg.event.title} · ${training.trainer.name}`}
    >
      <div className="truncate">
        <span className="font-semibold">{arg.timeText}</span> {arg.event.title}
      </div>
      {showTrainer && (
        <div className="truncate opacity-80">{training.trainer.name}</div>
      )}
    </div>
  )
}

/** Assigned client, else the name from the calendar entry, else its title. */
function labelOf(training: Training): string {
  return training.client?.name ?? training.clientName ?? training.title
}
