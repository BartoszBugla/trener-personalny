import { KeyRound, UserMinus } from 'lucide-react'
import { useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'

import { SortableHead } from '#/components/sortable-head'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '#/components/ui/alert-dialog'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Switch } from '#/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { useFormatters } from '#/i18n/use-locale'
import type { SortDirection } from '#/shared/list-query'
import type {
  UserGroup,
  UserListItem,
  UserSortField,
} from '#/shared/users/users.dto'
import { useRevokeAccess, useUpdateUser } from '../users.queries'
import { GrantAccessDialog } from './grant-access-dialog'

const COLUMN_LABEL_KEYS = {
  name: 'users.fields.name',
  email: 'users.fields.email',
  phone: 'users.fields.phone',
  role: 'users.fields.isTrainer',
  trainings: 'users.fields.trainings',
  lastTraining: 'users.fields.lastTraining',
} as const satisfies Record<UserSortField, string>

/** Columns per list: app users vs clients ("podopieczni"). */
const COLUMNS: Record<UserGroup, Array<UserSortField>> = {
  app: ['name', 'email', 'role', 'lastTraining'],
  clients: ['name', 'email', 'phone', 'trainings', 'lastTraining'],
}

export function UserTable({
  group,
  users,
  sortBy,
  sort,
  onSort,
}: {
  group: UserGroup
  users: Array<UserListItem>
  sortBy: UserSortField
  sort: SortDirection
  onSort: (field: UserSortField) => void
}) {
  const updateUser = useUpdateUser()
  const revoke = useRevokeAccess()
  const { t } = useTranslation()
  const format = useFormatters()
  const [granting, setGranting] = useState<UserListItem | null>(null)
  const [revoking, setRevoking] = useState<UserListItem | null>(null)
  const columns = COLUMNS[group]

  const cell = (user: UserListItem, field: UserSortField) => {
    switch (field) {
      case 'name':
        return <TableCell className="font-medium">{user.name}</TableCell>
      case 'email':
        return (
          <TableCell className="text-muted-foreground">
            {user.email ?? '—'}
          </TableCell>
        )
      case 'phone':
        return (
          <TableCell className="text-muted-foreground whitespace-nowrap">
            {user.phone ?? '—'}
          </TableCell>
        )
      case 'trainings':
        return (
          <TableCell className="tabular-nums">{user.trainingCount}</TableCell>
        )
      case 'lastTraining':
        return (
          <TableCell className="text-muted-foreground whitespace-nowrap">
            {user.lastTrainingAt ? format.date(user.lastTrainingAt) : '—'}
          </TableCell>
        )
      case 'role':
        return (
          <TableCell>
            <Switch
              checked={user.isTrainer}
              onCheckedChange={(isTrainer) =>
                updateUser.mutate({ id: user.id, isTrainer })
              }
              aria-label={t('users.isTrainerAria', { name: user.name })}
            />
          </TableCell>
        )
    }
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((field) => (
              <SortableHead
                key={field}
                label={t(COLUMN_LABEL_KEYS[field])}
                direction={sortBy === field ? sort : null}
                onClick={() => onSort(field)}
              />
            ))}
            {group === 'app' && <TableHead>{t('users.app.access')}</TableHead>}
            <TableHead className="w-0">
              <span className="sr-only">{t('trainings.table.actions')}</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              {columns.map((field) => (
                <CellFragment key={field}>{cell(user, field)}</CellFragment>
              ))}
              {group === 'app' && (
                <TableCell>
                  {user.appAccess ? (
                    <Badge variant="secondary">
                      {t('users.app.canSignIn')}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      {t('users.app.noAccess')}
                    </Badge>
                  )}
                </TableCell>
              )}
              <TableCell className="text-right whitespace-nowrap">
                {user.appAccess ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setRevoking(user)}
                  >
                    <UserMinus className="size-4" />
                    {t('users.revoke.action')}
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setGranting(user)}
                  >
                    <KeyRound className="size-4" />
                    {t('users.grant.action')}
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <GrantAccessDialog
        user={granting}
        onOpenChange={(open) => !open && setGranting(null)}
      />
      <AlertDialog
        open={revoking !== null}
        onOpenChange={(open) => !open && setRevoking(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('users.revoke.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              <Trans
                i18nKey="users.revoke.description"
                values={{ name: revoking?.name ?? '' }}
                components={{ strong: <strong /> }}
              />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => revoking && revoke.mutate(revoking.id)}
            >
              {t('users.revoke.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

/** Keeps `cell()` results keyed inside `columns.map`. */
function CellFragment({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
