import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  lt,
  lte,
  or,
  sql,
} from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import type { SQLiteColumn } from 'drizzle-orm/sqlite-core'
import { inject, injectable } from 'inversify'

import type { DB } from '../../core/database/database.module'
import {
  containsSql,
  localTimeSql,
  normalizedSql,
  sortKeySql,
} from '../../core/database/sql-functions'
import { TOKENS } from '../../core/di/tokens'
import { users } from '../users/users.table'
import {
  ACTIVE_TRAINING_STATUSES,
  ignoredTitles,
  trainings,
} from './trainings.table'
import type { SortDirection } from '#/shared/list-query'
import type { TrainingSortField } from '#/shared/trainings/trainings.dto'
import type {
  NewTrainingRow,
  TrainingRow,
  TrainingSource,
} from './trainings.table'

const trainer = alias(users, 'trainer')
const client = alias(users, 'client')

export interface TrainingWithPeople {
  training: TrainingRow
  trainer: { id: number; name: string }
  client: { id: number; name: string } | null
}

export interface TrainingFilter {
  statuses?: Array<TrainingRow['status']>
  trainerId?: number
  unassigned?: boolean
  /**
   * Normalized (`normalizeName`) substring of the title, calendar client
   * name, notes or assigned client's name.
   */
  search?: string
  from?: Date
  /** Exclusive. */
  until?: Date
}

/** Data access only – no business rules here. */
@injectable()
export class TrainingsRepository {
  constructor(@inject(TOKENS.Database) private readonly db: DB) {}

  findAllWithPeople(): Promise<Array<TrainingWithPeople>> {
    return this.db
      .select({
        training: trainings,
        trainer: { id: trainer.id, name: trainer.name },
        client: { id: client.id, name: client.name },
      })
      .from(trainings)
      .innerJoin(trainer, eq(trainer.id, trainings.trainerId))
      .leftJoin(client, eq(client.id, trainings.clientId))
      .orderBy(asc(trainings.startsAt), asc(trainings.id))
  }

  /** All trainings matching `filter`, by start time. */
  findWithPeople(filter: TrainingFilter): Promise<Array<TrainingWithPeople>> {
    return this.db
      .select({
        training: trainings,
        trainer: { id: trainer.id, name: trainer.name },
        client: { id: client.id, name: client.name },
      })
      .from(trainings)
      .innerJoin(trainer, eq(trainer.id, trainings.trainerId))
      .leftJoin(client, eq(client.id, trainings.clientId))
      .where(whereOf(filter))
      .orderBy(asc(trainings.startsAt), asc(trainings.id))
  }

  /** One page of trainings matching `filter`, with their total count. */
  async findPageWithPeople(
    filter: TrainingFilter,
    page: {
      offset: number
      limit: number
      sortBy: TrainingSortField
      sort: SortDirection
    },
  ): Promise<{ rows: Array<TrainingWithPeople>; total: number }> {
    const where = whereOf(filter)
    const rows = await this.db
      .select({
        training: trainings,
        trainer: { id: trainer.id, name: trainer.name },
        client: { id: client.id, name: client.name },
      })
      .from(trainings)
      .innerJoin(trainer, eq(trainer.id, trainings.trainerId))
      .leftJoin(client, eq(client.id, trainings.clientId))
      .where(where)
      .orderBy(...orderOf(page.sortBy, page.sort))
      .limit(page.limit)
      .offset(page.offset)
    const [{ total }] = await this.db
      .select({ total: count() })
      .from(trainings)
      .leftJoin(client, eq(client.id, trainings.clientId))
      .where(where)
    return { rows, total }
  }

  async countUnassigned(): Promise<number> {
    const [{ total }] = await this.db
      .select({ total: count() })
      .from(trainings)
      .where(
        and(
          isNull(trainings.clientId),
          inArray(trainings.status, [...ACTIVE_TRAINING_STATUSES]),
        ),
      )
    return total
  }

  async findById(id: number): Promise<TrainingRow | undefined> {
    const [row] = await this.db
      .select()
      .from(trainings)
      .where(eq(trainings.id, id))
      .limit(1)
    return row
  }

  async findByExternalId(
    source: TrainingSource,
    externalId: string,
  ): Promise<TrainingRow | undefined> {
    const [row] = await this.db
      .select()
      .from(trainings)
      .where(
        and(eq(trainings.source, source), eq(trainings.externalId, externalId)),
      )
      .limit(1)
    return row
  }

  /** Active (not removed/ignored) trainings of a trainer within a period. */
  findActiveForReconciliation(params: {
    source: TrainingSource
    trainerId: number
    from?: Date
    until: Date
  }): Promise<Array<TrainingRow>> {
    return this.db
      .select()
      .from(trainings)
      .where(
        and(
          eq(trainings.source, params.source),
          eq(trainings.trainerId, params.trainerId),
          inArray(trainings.status, [...ACTIVE_TRAINING_STATUSES]),
          lte(trainings.startsAt, params.until),
          params.from ? gte(trainings.startsAt, params.from) : undefined,
        ),
      )
  }

  /** Attended trainings with a known client – input for billing. */
  findConfirmedWithClient(): Promise<
    Array<{ clientId: number; startsAt: Date }>
  > {
    return this.db
      .select({
        clientId: sql<number>`${trainings.clientId}`,
        startsAt: trainings.startsAt,
      })
      .from(trainings)
      .where(
        and(eq(trainings.status, 'confirmed'), isNotNull(trainings.clientId)),
      )
      .orderBy(asc(trainings.startsAt))
  }

  /** Trainings (any status) – callers filter by normalized title in memory. */
  findAllRows(): Promise<Array<TrainingRow>> {
    return this.db.select().from(trainings)
  }

  async findIgnoredTitles(): Promise<Set<string>> {
    const rows = await this.db
      .select({ normalizedTitle: ignoredTitles.normalizedTitle })
      .from(ignoredTitles)
    return new Set(rows.map((r) => r.normalizedTitle))
  }

  async addIgnoredTitle(normalizedTitle: string, title: string): Promise<void> {
    await this.db
      .insert(ignoredTitles)
      .values({ normalizedTitle, title })
      .onConflictDoNothing()
  }

  /** Returns whether a rule existed. */
  async removeIgnoredTitle(normalizedTitle: string): Promise<boolean> {
    const deleted = await this.db
      .delete(ignoredTitles)
      .where(eq(ignoredTitles.normalizedTitle, normalizedTitle))
      .returning()
    return deleted.length > 0
  }

  findUnassigned(): Promise<Array<TrainingRow>> {
    return this.db.select().from(trainings).where(isNull(trainings.clientId))
  }

  async create(data: NewTrainingRow): Promise<TrainingRow> {
    const [row] = await this.db.insert(trainings).values(data).returning()
    return row
  }

  async update(
    id: number,
    data: Partial<NewTrainingRow>,
  ): Promise<TrainingRow | undefined> {
    const [row] = await this.db
      .update(trainings)
      .set({ ...data, updatedAt: sql`(unixepoch())` })
      .where(eq(trainings.id, id))
      .returning()
    return row
  }
}

function whereOf(filter: TrainingFilter): SQL | undefined {
  const search = filter.search
  return and(
    filter.statuses ? inArray(trainings.status, filter.statuses) : undefined,
    filter.trainerId ? eq(trainings.trainerId, filter.trainerId) : undefined,
    filter.unassigned ? isNull(trainings.clientId) : undefined,
    filter.from ? gte(trainings.startsAt, filter.from) : undefined,
    filter.until ? lt(trainings.startsAt, filter.until) : undefined,
    search
      ? or(
          containsSql(normalizedSql(trainings.title), search),
          containsSql(normalizedSql(trainings.clientName), search),
          containsSql(normalizedSql(trainings.notes), search),
          containsSql(client.normalizedName, search),
        )
      : undefined,
  )
}

/**
 * ORDER BY for a column of the table, then by start time and id so pages are
 * stable. Text columns sort by their normalized form ("Łukasz" next to
 * "Lucyna"); empty values always go last.
 */
function orderOf(
  field: TrainingSortField,
  direction: SortDirection,
): Array<SQL> {
  const dir = direction === 'asc' ? asc : desc
  const byStart = [dir(trainings.startsAt), dir(trainings.id)]
  /** Text sort key; empty values go last in both directions. */
  const byText = (value: SQLiteColumn | SQL) => {
    const key = sortKeySql(value)
    return [sql`${key} IS NULL`, dir(key), ...byStart]
  }
  switch (field) {
    case 'date':
      return byStart
    case 'time':
      return [dir(localTimeSql(trainings.startsAt)), ...byStart]
    case 'trainer':
      return byText(trainer.name)
    case 'client':
      // What the table shows: the client, else the name from the calendar.
      return byText(sql`coalesce(${client.name}, ${trainings.clientName})`)
    case 'status':
      return [dir(trainings.status), ...byStart]
    case 'notes':
      return byText(trainings.notes)
  }
}
