import {
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import {
  createAppUser,
  createUser,
  getUsers,
  grantAccess,
  listUsers,
  revokeAccess,
  updateUser,
} from './users.functions'
import type {
  CreateAppUserDto,
  CreateUserDto,
  GrantAccessDto,
  ListUsersQuery,
  UpdateUserDto,
  User,
} from '#/shared/users/users.dto'

export const userKeys = {
  all: ['users'] as const,
  list: () => [...userKeys.all, 'list'] as const,
  page: (query: ListUsersQuery) => [...userKeys.all, 'page', query] as const,
}

export const usersQueryOptions = () =>
  queryOptions({
    queryKey: userKeys.list(),
    queryFn: () => getUsers(),
  })

export const usersPageQueryOptions = (query: ListUsersQuery) =>
  queryOptions({
    queryKey: userKeys.page(query),
    queryFn: () => listUsers({ data: query }),
  })

export function useCreateUser() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useMutation({
    mutationFn: (data: CreateUserDto) => createUser({ data }),
    onSuccess: (user) => {
      toast.success(t('users.toast.created', { name: user.name }))
      return queryClient.invalidateQueries({ queryKey: userKeys.all })
    },
    onError: (error) => toast.error(error.message),
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateUserDto) => updateUser({ data }),
    // Trainer flag changes affect how trainings render too.
    onSuccess: () => queryClient.invalidateQueries(),
    onError: (error) => toast.error(error.message),
  })
}

/** Access changes move people between Users and Clients – refresh both. */
function useAccessMutation<TInput>(
  mutationFn: (data: TInput) => Promise<User>,
  successKey:
    | 'users.toast.appUserCreated'
    | 'users.toast.accessGranted'
    | 'users.toast.accessRevoked',
) {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  return useMutation({
    mutationFn,
    onSuccess: (user) => {
      toast.success(t(successKey, { name: user.name }))
      return queryClient.invalidateQueries({ queryKey: userKeys.all })
    },
    onError: (error) => toast.error(error.message),
  })
}

export const useCreateAppUser = () =>
  useAccessMutation(
    (data: CreateAppUserDto) => createAppUser({ data }),
    'users.toast.appUserCreated',
  )

export const useGrantAccess = () =>
  useAccessMutation(
    (data: GrantAccessDto) => grantAccess({ data }),
    'users.toast.accessGranted',
  )

export const useRevokeAccess = () =>
  useAccessMutation(
    (id: number) => revokeAccess({ data: { id } }),
    'users.toast.accessRevoked',
  )
