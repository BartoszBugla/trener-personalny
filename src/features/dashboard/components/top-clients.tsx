import { useTranslation } from 'react-i18next'

import type { DashboardSummary } from '#/shared/dashboard/dashboard.dto'

/**
 * Ranked horizontal bars (one hue, largest first), value at the bar tip.
 */
export function TopClients({
  clients,
}: {
  clients: DashboardSummary['topClients']
}) {
  const { t } = useTranslation()
  if (clients.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        {t('dashboard.topClients.empty')}
      </p>
    )
  }
  const max = clients[0].count

  return (
    <ul className="space-y-2.5">
      {clients.map((client) => (
        <li
          key={client.id}
          className="grid grid-cols-[minmax(0,9rem)_1fr] items-center gap-3 text-sm"
          aria-label={t('dashboard.topClients.row', {
            name: client.name,
            count: client.count,
          })}
        >
          <span className="truncate" title={client.name}>
            {client.name}
          </span>
          <span className="flex items-center gap-2">
            <span
              className="bg-viz-accent block h-3 rounded-r-[4px]"
              style={{ width: `${(client.count / max) * 85}%` }}
              aria-hidden
            />
            <span className="text-muted-foreground text-xs tabular-nums">
              {client.count}
            </span>
          </span>
        </li>
      ))}
    </ul>
  )
}
