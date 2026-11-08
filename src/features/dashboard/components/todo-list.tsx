import { Link } from '@tanstack/react-router'
import {
  CheckCircle2,
  ChevronRight,
  MessageSquareWarning,
  UserX,
  Wallet,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { DashboardSummary } from '#/shared/dashboard/dashboard.dto'

/** Things waiting for the trainer, each linking to where it's resolved. */
export function TodoList({ todo }: { todo: DashboardSummary['todo'] }) {
  const { t } = useTranslation()
  const items = [
    {
      key: 'unassigned',
      count: todo.unassigned,
      icon: UserX,
      label: t('dashboard.todo.unassigned', { count: todo.unassigned }),
      link: (
        <Link to="/trainings" search={{ unassigned: true }}>
          {t('dashboard.todo.assign')}
        </Link>
      ),
    },
    {
      key: 'smsDue',
      count: todo.smsDue,
      icon: MessageSquareWarning,
      label: t('dashboard.todo.smsDue', { count: todo.smsDue }),
      link: <Link to="/billing">{t('dashboard.todo.openBilling')}</Link>,
    },
    {
      key: 'withoutPlan',
      count: todo.withoutPlan,
      icon: Wallet,
      label: t('dashboard.todo.withoutPlan', { count: todo.withoutPlan }),
      link: <Link to="/billing">{t('dashboard.todo.openBilling')}</Link>,
    },
  ].filter((item) => item.count > 0)

  if (items.length === 0) {
    return (
      <p className="text-muted-foreground flex items-center gap-2 text-sm">
        <CheckCircle2 className="size-4" aria-hidden />
        {t('dashboard.todo.allDone')}
      </p>
    )
  }

  return (
    <ul className="divide-y">
      {items.map(({ key, icon: Icon, label, link }) => (
        <li key={key} className="flex items-center gap-3 py-2.5 text-sm">
          <Icon className="text-muted-foreground size-4 shrink-0" aria-hidden />
          <span className="flex-1">{label}</span>
          <span className="text-muted-foreground hover:text-foreground flex items-center gap-0.5 text-xs whitespace-nowrap [&>a]:hover:underline">
            {link}
            <ChevronRight className="size-3.5" aria-hidden />
          </span>
        </li>
      ))}
    </ul>
  )
}
