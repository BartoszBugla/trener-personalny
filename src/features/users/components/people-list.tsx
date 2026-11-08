import { useTranslation } from 'react-i18next'

import { PaginationBar } from '#/components/pagination-bar'
import { PAGE_SIZES } from '#/shared/list-query'
import type { SortDirection } from '#/shared/list-query'
import type {
  ListUsersQuery,
  ListUsersSearch,
  UserSortField,
  UsersPage,
} from '#/shared/users/users.dto'
import { UserFilters, hasActiveUserFilters } from './user-filters'
import { UserTable } from './user-table'

/** First click on a column: A→Z for text, most / latest first for numbers. */
const DEFAULT_SORT_DIRECTION: Record<UserSortField, SortDirection> = {
  name: 'asc',
  email: 'asc',
  phone: 'asc',
  role: 'desc',
  trainings: 'desc',
  lastTraining: 'desc',
}

/**
 * Filters + sortable table + pagination for one of the people lists
 * (app users / clients). URL state is owned by the route.
 */
export function PeopleList({
  query,
  data,
  onFilters,
  onPage,
  onClear,
}: {
  query: ListUsersQuery
  data: UsersPage
  /** Filter/sort change – the route resets the page to 1. */
  onFilters: (patch: Partial<ListUsersSearch>) => void
  onPage: (page: number) => void
  onClear: () => void
}) {
  const { t } = useTranslation()
  const empty =
    query.group === 'app' ? t('users.app.empty') : t('users.clients.empty')

  return (
    <div className="space-y-4">
      <UserFilters query={query} onChange={onFilters} onClear={onClear} />
      {data.total === 0 ? (
        <p className="text-muted-foreground py-8 text-center text-sm">
          {hasActiveUserFilters(query) ? t('users.noResults') : empty}
        </p>
      ) : (
        <>
          <UserTable
            group={query.group}
            users={data.items}
            sortBy={query.sortBy}
            sort={query.sort}
            onSort={(field) =>
              onFilters({
                sortBy: field,
                sort:
                  field === query.sortBy
                    ? query.sort === 'asc'
                      ? 'desc'
                      : 'asc'
                    : DEFAULT_SORT_DIRECTION[field],
              })
            }
          />
          <PaginationBar
            page={data.page}
            pageCount={data.pageCount}
            pageSize={data.pageSize}
            total={data.total}
            pageSizes={PAGE_SIZES}
            onPageChange={onPage}
            onPageSizeChange={(pageSize) => onFilters({ pageSize })}
          />
        </>
      )}
    </div>
  )
}
