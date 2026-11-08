import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '#/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'

interface PaginationBarProps {
  page: number
  pageCount: number
  pageSize: number
  total: number
  pageSizes: ReadonlyArray<number>
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
}

/** "51–100 of 6818 · Per page [50] · « ‹ Page 2 of 137 › »". */
export function PaginationBar({
  page,
  pageCount,
  pageSize,
  total,
  pageSizes,
  onPageChange,
  onPageSizeChange,
}: PaginationBarProps) {
  const { t } = useTranslation()
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)
  const isFirst = page <= 1
  const isLast = page >= pageCount

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground tabular-nums">
        {t('pagination.range', { from, to, total })}
      </span>
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">
            {t('pagination.perPage')}
          </span>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => onPageSizeChange(Number(value))}
          >
            <SelectTrigger size="sm" className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizes.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            disabled={isFirst}
            onClick={() => onPageChange(1)}
            aria-label={t('pagination.first')}
          >
            <ChevronsLeft />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            disabled={isFirst}
            onClick={() => onPageChange(page - 1)}
            aria-label={t('pagination.previous')}
          >
            <ChevronLeft />
          </Button>
          <span className="px-2 tabular-nums">
            {t('pagination.page', { page, pages: pageCount })}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            disabled={isLast}
            onClick={() => onPageChange(page + 1)}
            aria-label={t('pagination.next')}
          >
            <ChevronRight />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            disabled={isLast}
            onClick={() => onPageChange(pageCount)}
            aria-label={t('pagination.last')}
          >
            <ChevronsRight />
          </Button>
        </div>
      </div>
    </div>
  )
}
