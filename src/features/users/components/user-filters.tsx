import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { SearchInput } from '#/components/search-input'
import { Button } from '#/components/ui/button'
import { Label } from '#/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { Switch } from '#/components/ui/switch'
import { USER_ROLE_FILTERS } from '#/shared/users/users.dto'
import type {
  ListUsersQuery,
  ListUsersSearch,
  UserRoleFilter,
} from '#/shared/users/users.dto'

/** True when any filter differs from the defaults (pagination/sort excluded). */
export function hasActiveUserFilters(query: ListUsersQuery): boolean {
  return Boolean(query.q || query.noPhone || query.role !== 'all')
}

/** Role filter on the app-users list, "without phone" on the clients list. */
export function UserFilters({
  query,
  onChange,
  onClear,
}: {
  query: ListUsersQuery
  /** Applies a filter change (the page resets to 1). */
  onChange: (patch: Partial<ListUsersSearch>) => void
  onClear: () => void
}) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-wrap items-end gap-3">
      <SearchInput
        value={query.q ?? ''}
        onChange={(q) => onChange({ q })}
        placeholder={t('users.filters.search')}
      />

      {query.group === 'app' && (
        <div className="space-y-1">
          <Label
            htmlFor="filter-role"
            className="text-muted-foreground text-xs"
          >
            {t('users.filters.role')}
          </Label>
          <Select
            value={query.role}
            onValueChange={(value) =>
              onChange({ role: value as UserRoleFilter })
            }
          >
            <SelectTrigger id="filter-role" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {USER_ROLE_FILTERS.map((role) => (
                <SelectItem key={role} value={role}>
                  {t(`users.filters.roles.${role}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {query.group === 'clients' && (
        <div className="flex h-9 items-center gap-2">
          <Switch
            id="filter-no-phone"
            checked={query.noPhone ?? false}
            onCheckedChange={(checked) =>
              onChange({ noPhone: checked || undefined })
            }
          />
          <Label htmlFor="filter-no-phone">{t('users.filters.noPhone')}</Label>
        </div>
      )}

      {hasActiveUserFilters(query) && (
        <Button variant="ghost" onClick={onClear}>
          <X className="size-4" />
          {t('users.filters.clear')}
        </Button>
      )}
    </div>
  )
}
