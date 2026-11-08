import { createServerFn } from '@tanstack/react-start'

import { defaultMiddleware } from '#/lib/server-fn/middleware'
import { resolve } from '#/server/app'
import { UsersService } from '#/server/modules/users/users.service'
import { AccessService } from '#/server/modules/auth/access.service'
import { requireRequestUser } from '#/server/modules/auth/request-auth'
import {
  createAppUserSchema,
  createUserSchema,
  grantAccessSchema,
  listUsersSchema,
  updateUserSchema,
  userIdSchema,
} from '#/shared/users/users.dto'

/** All users (pickers: assigning clients, trainer filter, billing). */
export const getUsers = createServerFn({ method: 'GET' })
  .middleware(defaultMiddleware)
  .handler(() => resolve(UsersService).findAll())

/** One page of the users screen. */
export const listUsers = createServerFn({ method: 'GET' })
  .middleware(defaultMiddleware)
  .validator(listUsersSchema)
  .handler(({ data }) => resolve(UsersService).list(data))

export const createUser = createServerFn({ method: 'POST' })
  .middleware(defaultMiddleware)
  .validator(createUserSchema)
  .handler(({ data }) => resolve(UsersService).create(data))

export const updateUser = createServerFn({ method: 'POST' })
  .middleware(defaultMiddleware)
  .validator(updateUserSchema)
  .handler(({ data }) => resolve(UsersService).update(data))

/** Adds an app user (can sign in). */
export const createAppUser = createServerFn({ method: 'POST' })
  .middleware(defaultMiddleware)
  .validator(createAppUserSchema)
  .handler(({ data }) => resolve(AccessService).createAppUser(data))

/** Gives a client ("podopieczny") access to the app with their email. */
export const grantAccess = createServerFn({ method: 'POST' })
  .middleware(defaultMiddleware)
  .validator(grantAccessSchema)
  .handler(({ data }) => resolve(AccessService).grantAccess(data))

export const revokeAccess = createServerFn({ method: 'POST' })
  .middleware(defaultMiddleware)
  .validator(userIdSchema)
  .handler(async ({ data }) =>
    resolve(AccessService).revokeAccess(data, await requireRequestUser()),
  )
