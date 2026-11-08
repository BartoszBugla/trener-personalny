import { and, asc, count, desc, eq, isNull, lte, or, sql } from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'
import { inject, injectable } from 'inversify'

import type { DB } from '../../core/database/database.module'
import { TOKENS } from '../../core/di/tokens'
import { containsSql, sortKeySql } from '../../core/database/sql-functions'
import { trainings } from '../trainings/trainings.table'
import { userAliases, users } from './users.table'
import type { NewUserRow, UserRow } from './users.table'
import type { SortDirection } from '#/shared/list-query'
import type {
  UserGroup,
  UserRoleFilter,
  UserSortField,
} from '#/shared/users/users.dto'

export interface UserFilter {
  group: UserGroup
  role?: UserRoleFilter
  noPhone?: boolean
  /** Normalized name fragment. */
  name?: string
  /** Raw fragment matched against email / phone. */
  contact?: string
}

export interface UserWithStats {
  user: UserRow
  trainingCount: number
  lastTrainingAt: Date | null
}

/** Data access only – no business rules here. */
@injectable()
export class UsersRepository {
  constructor(@inject(TOKENS.Database) private readonly db: DB) {}

  findAll(): Promise<Array<UserRow>> {
    return this.db.select().from(users).orderBy(asc(users.name), asc(users.id))
  }

  /** One page of users with training stats, plus the total count. */
  async findPageWithStats(
    filter: UserFilter,
    page: {
      offset: number
      limit: number
      sortBy: UserSortField
      sort: SortDirection
      now: Date
    },
  ): Promise<{ rows: Array<UserWithStats>; total: number }> {
    const where = whereOf(filter)
    const involved = or(
      eq(trainings.clientId, users.id),
      eq(trainings.trainerId, users.id),
    )
    const trainingCount = sql<number>`(
      select count(*) from ${trainings}
      where ${involved} and ${trainings.status} = 'confirmed'
    )`.mapWith(Number)
    // Raw unix seconds; mapped to Date below.
    const lastTrainingAt = sql<number | null>`(
      select max(${trainings.startsAt}) from ${trainings}
      where ${involved} and ${trainings.status} = 'confirmed'
        and ${lte(trainings.startsAt, page.now)}
    )`

    const dir = page.sort === 'asc' ? asc : desc
    const byName = [dir(sortKeySql(users.name)), dir(users.id)]
    const lastIfNull = (value: SQL) => [sql`${value} IS NULL`, dir(value)]
    const order: Record<UserSortField, Array<SQL>> = {
      name: byName,
      email: [...lastIfNull(sql`${users.email}`), ...byName],
      phone: [...lastIfNull(sql`${users.phone}`), ...byName],
      role: [dir(users.isTrainer), ...byName],
      trainings: [dir(trainingCount), ...byName],
      lastTraining: [...lastIfNull(lastTrainingAt), ...byName],
    }

    const rows = await this.db
      .select({ user: users, trainingCount, lastTrainingAt })
      .from(users)
      .where(where)
      .orderBy(...order[page.sortBy])
      .limit(page.limit)
      .offset(page.offset)
    const [{ total }] = await this.db
      .select({ total: count() })
      .from(users)
      .where(where)
    return {
      rows: rows.map((r) => ({
        user: r.user,
        trainingCount: r.trainingCount,
        lastTrainingAt:
          r.lastTrainingAt === null ? null : new Date(r.lastTrainingAt * 1000),
      })),
      total,
    }
  }

  async findById(id: number): Promise<UserRow | undefined> {
    const [row] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1)
    return row
  }

  async findByEmail(email: string): Promise<UserRow | undefined> {
    const [row] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)
    return row
  }

  async findByPhone(phone: string): Promise<UserRow | undefined> {
    const [row] = await this.db
      .select()
      .from(users)
      .where(eq(users.phone, phone))
      .limit(1)
    return row
  }

  findByNormalizedName(normalizedName: string): Promise<Array<UserRow>> {
    return this.db
      .select()
      .from(users)
      .where(eq(users.normalizedName, normalizedName))
  }

  async findByAlias(alias: string): Promise<UserRow | undefined> {
    const [row] = await this.db
      .select({ user: users })
      .from(userAliases)
      .innerJoin(users, eq(users.id, userAliases.userId))
      .where(eq(userAliases.alias, alias))
      .limit(1)
    return row?.user
  }

  async create(data: NewUserRow): Promise<UserRow> {
    const [row] = await this.db.insert(users).values(data).returning()
    return row
  }

  async update(
    id: number,
    data: Partial<NewUserRow>,
  ): Promise<UserRow | undefined> {
    const [row] = await this.db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning()
    return row
  }

  /** Points `alias` at `userId` (re-pointing it if it already existed). */
  async upsertAlias(alias: string, userId: number): Promise<void> {
    await this.db
      .insert(userAliases)
      .values({ alias, userId })
      .onConflictDoUpdate({ target: userAliases.alias, set: { userId } })
  }
}

function whereOf(filter: UserFilter): SQL | undefined {
  return and(
    filter.group === 'app'
      ? or(eq(users.appAccess, true), eq(users.isTrainer, true))
      : and(eq(users.appAccess, false), eq(users.isTrainer, false)),
    filter.role === 'trainers' ? eq(users.isTrainer, true) : undefined,
    filter.role === 'others' ? eq(users.isTrainer, false) : undefined,
    filter.noPhone ? isNull(users.phone) : undefined,
    filter.name || filter.contact
      ? or(
          filter.name
            ? containsSql(users.normalizedName, filter.name)
            : undefined,
          filter.contact ? containsSql(users.email, filter.contact) : undefined,
          filter.contact ? containsSql(users.phone, filter.contact) : undefined,
        )
      : undefined,
  )
}
