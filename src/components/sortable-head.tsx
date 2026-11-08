import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '#/components/ui/button'
import { TableHead } from '#/components/ui/table'
import { cn } from '#/lib/utils'
import type { SortDirection } from '#/shared/list-query'

/** Column header toggling the sort; shows the current direction. */
export function SortableHead({
  label,
  direction,
  onClick,
}: {
  label: string
  direction: SortDirection | null
  onClick: () => void
}) {
  const { t } = useTranslation()
  const Icon =
    direction === 'asc'
      ? ArrowUp
      : direction === 'desc'
        ? ArrowDown
        : ArrowUpDown
  return (
    <TableHead
      aria-sort={
        direction === 'asc'
          ? 'ascending'
          : direction === 'desc'
            ? 'descending'
            : 'none'
      }
    >
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3 h-8"
        onClick={onClick}
        title={t('common.sortBy', { column: label })}
      >
        {label}
        <Icon className={cn('size-3.5', !direction && 'opacity-40')} />
      </Button>
    </TableHead>
  )
}
