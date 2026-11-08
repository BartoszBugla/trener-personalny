import { DEFAULT_PAGE_SIZE } from '#/shared/list-query'
import { listUsersSchema } from '#/shared/users/users.dto'

/**
 * Search params of a people list route. The group (app users / clients) is
 * fixed by the route, so it's not part of the URL.
 */
export const peopleSearchSchema = listUsersSchema.omit({ group: true })

/** Defaults are kept out of the URL (`/users` instead of `?page=1&…`). */
export const PEOPLE_SEARCH_DEFAULTS = {
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  role: 'all',
  sortBy: 'name',
  sort: 'asc',
} as const
