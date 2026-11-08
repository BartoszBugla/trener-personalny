import { createFileRoute, stripSearchParams } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { CreateUserDialog } from '#/features/users/components/create-user-dialog'
import { PeopleList } from '#/features/users/components/people-list'
import {
  PEOPLE_SEARCH_DEFAULTS,
  peopleSearchSchema,
} from '#/features/users/people-route'
import { usersPageQueryOptions } from '#/features/users/users.queries'
import type { ListUsersSearch } from '#/shared/users/users.dto'
import { pageTitle } from '../__root'

/** Clients ("podopieczni"): people without an account. */
export const Route = createFileRoute('/clients/')({
  validateSearch: peopleSearchSchema,
  search: { middlewares: [stripSearchParams(PEOPLE_SEARCH_DEFAULTS)] },
  loaderDeps: ({ search }) => ({ ...search, group: 'clients' as const }),
  loader: ({ context, deps }) =>
    context.queryClient.ensureQueryData(usersPageQueryOptions(deps)),
  head: ({ match }) => ({
    meta: [{ title: pageTitle(match.context.locale, 'users.clients.title') }],
  }),
  component: ClientsPage,
})

function ClientsPage() {
  const search = Route.useSearch()
  const query = { ...search, group: 'clients' as const }
  const navigate = Route.useNavigate()
  const { data } = useSuspenseQuery(usersPageQueryOptions(query))
  const { t } = useTranslation()

  const setFilters = useCallback(
    (patch: Partial<ListUsersSearch>) =>
      void navigate({
        search: (prev) => ({ ...prev, ...patch, page: 1 }),
        replace: true,
        resetScroll: false,
      }),
    [navigate],
  )

  return (
    <Card className="mx-auto max-w-6xl">
      <CardHeader>
        <CardTitle>{t('users.clients.title')}</CardTitle>
        <CardDescription>{t('users.clients.description')}</CardDescription>
        <CardAction>
          <CreateUserDialog />
        </CardAction>
      </CardHeader>
      <CardContent>
        <PeopleList
          query={query}
          data={data}
          onFilters={setFilters}
          onPage={(page) =>
            void navigate({ search: (prev) => ({ ...prev, page }) })
          }
          onClear={() =>
            void navigate({ search: { pageSize: search.pageSize } })
          }
        />
      </CardContent>
    </Card>
  )
}
