import { z } from 'zod'

import {
  pageSchema,
  pageSizeSchema,
  searchTextSchema,
  sortDirectionSchema,
} from '../list-query'
import type { Page } from '../list-query'

/**
 * Optional text input: forms always send a string, an empty one means "not
 * provided" and becomes `undefined`. Non-empty values must pass `isValid`.
 */
const optionalText = (isValid: (v: string) => boolean, message: string) =>
  z
    .string()
    .trim()
    .refine((v) => v === '' || isValid(v), message)
    .transform((v) => (v === '' ? undefined : v))

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE = /^\+?[0-9 ()-]{6,20}$/

export const createUserSchema = z.object({
  name: z.string().trim().min(1, 'validation.nameRequired').max(200),
  email: optionalText(
    (v) => EMAIL.test(v),
    'validation.invalidEmail',
  ).transform((v) => v?.toLowerCase()),
  phone: optionalText((v) => PHONE.test(v), 'validation.invalidPhone'),
  isTrainer: z.boolean(),
})
/** Raw form values (what the client sends). */
export type CreateUserDto = z.input<typeof createUserSchema>
/** Validated values (what the service receives). */
export type CreateUserValues = z.output<typeof createUserSchema>

export const userIdSchema = z.object({
  id: z.coerce.number().int().positive(),
})

/** Required email of an app user (sign-in is matched by it). */
const loginEmail = z
  .string()
  .trim()
  .min(1, 'validation.emailRequired')
  .refine((v) => EMAIL.test(v), 'validation.invalidEmail')
  .transform((v) => v.toLowerCase())

/** New app user added by hand (can sign in right away). */
export const createAppUserSchema = z.object({
  name: z.string().trim().min(1, 'validation.nameRequired').max(200),
  email: loginEmail,
  isTrainer: z.boolean(),
})
export type CreateAppUserDto = z.input<typeof createAppUserSchema>

/** Turns a client into an app user. */
export const grantAccessSchema = userIdSchema.extend({ email: loginEmail })
export type GrantAccessDto = z.input<typeof grantAccessSchema>

export const updateUserSchema = userIdSchema.extend({
  isTrainer: z.boolean(),
})
export type UpdateUserDto = z.infer<typeof updateUserSchema>

/** Shape returned to the client (serializable). */
export interface User {
  id: number
  name: string
  email: string | null
  phone: string | null
  isTrainer: boolean
  /** May sign in (app user); otherwise a client without an account. */
  appAccess: boolean
  createdAt: string
}

/**
 * The two lists: `app` = app users (access to the app, or trainers),
 * `clients` = podopieczni (no account).
 */
export const USER_GROUPS = ['app', 'clients'] as const
export type UserGroup = (typeof USER_GROUPS)[number]

/** Role filter within the app-users list. */
export const USER_ROLE_FILTERS = ['all', 'trainers', 'others'] as const
export type UserRoleFilter = (typeof USER_ROLE_FILTERS)[number]

/** Sortable columns of the users table. */
export const USER_SORT_FIELDS = [
  'name',
  'email',
  'phone',
  'role',
  'trainings',
  'lastTraining',
] as const
export type UserSortField = (typeof USER_SORT_FIELDS)[number]

/** Filters + pagination of the users list (also the route's search params). */
export const listUsersSchema = z.object({
  /** Set by the route, not a user filter. */
  group: z.enum(USER_GROUPS).default('clients').catch('clients'),
  page: pageSchema,
  pageSize: pageSizeSchema,
  /** Matches name (ignoring case/diacritics), email or phone. */
  q: searchTextSchema,
  role: z.enum(USER_ROLE_FILTERS).default('all').catch('all'),
  /** Only users without a phone number (can't get payment reminder SMS). */
  noPhone: z.boolean().optional().catch(undefined),
  sortBy: z.enum(USER_SORT_FIELDS).default('name').catch('name'),
  sort: sortDirectionSchema('asc'),
})
export type ListUsersQuery = z.output<typeof listUsersSchema>
export type ListUsersSearch = z.input<typeof listUsersSchema>

/** Row of the users table. */
export interface UserListItem extends User {
  /** Confirmed trainings as client or as trainer (past and planned). */
  trainingCount: number
  /** Most recent confirmed training that already happened. */
  lastTrainingAt: string | null
}

export type UsersPage = Page<UserListItem>
