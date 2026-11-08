import { inject, injectable } from 'inversify'

import { NotFoundException } from '../../core/errors/http-exceptions'
import { LoggerService } from '../../core/logger/logger.service'
import { loadPage } from '../../core/pagination'
import { addLocalDays, startOfLocalDay } from '../../core/time/local-date'
import { UsersService } from '../users/users.service'
import { TrainingsRepository } from './trainings.repository'
import type { TrainingFilter, TrainingWithPeople } from './trainings.repository'
import type { TrainingRow } from './trainings.table'
import {
  assignClientSchema,
  ignoreTrainingSchema,
  listTrainingsSchema,
  restoreTrainingSchema,
  trainingsRangeSchema,
} from '#/shared/trainings/trainings.dto'
import type {
  AssignClientDto,
  IgnoreTrainingDto,
  RestoreTrainingDto,
  ListTrainingsSearch,
  Training,
  TrainingStatusFilter,
  TrainingsPage,
  TrainingsRangeQuery,
} from '#/shared/trainings/trainings.dto'
import { normalizeName } from '#/shared/users/normalize-name'

@injectable()
export class TrainingsService {
  constructor(
    @inject(TrainingsRepository) private readonly repo: TrainingsRepository,
    @inject(UsersService) private readonly users: UsersService,
    @inject(LoggerService) private readonly logger: LoggerService,
  ) {}

  async findAll(): Promise<Array<Training>> {
    const rows = await this.repo.findAllWithPeople()
    return rows.map(toTraining)
  }

  /** Filtered, paginated list for the trainings screen. */
  async list(input: ListTrainingsSearch): Promise<TrainingsPage> {
    const query = listTrainingsSchema.parse(input)
    const filter: TrainingFilter = {
      statuses: STATUSES_BY_FILTER[query.status],
      trainerId: query.trainerId,
      unassigned: query.unassigned,
      search: query.q ? normalizeName(query.q) || undefined : undefined,
      from: query.from ? startOfLocalDay(query.from) : undefined,
      until: query.to ? startOfLocalDay(addLocalDays(query.to, 1)) : undefined,
    }
    const { rows, total, page, pageCount } = await loadPage(
      query.page,
      query.pageSize,
      (offset, limit) =>
        this.repo.findPageWithPeople(filter, {
          offset,
          limit,
          sortBy: query.sortBy,
          sort: query.sort,
        }),
    )

    return {
      items: rows.map(toTraining),
      total,
      page,
      pageSize: query.pageSize,
      pageCount,
      unassignedTotal: await this.repo.countUnassigned(),
    }
  }

  /** Every training starting in [from, to), for the calendar. */
  async listRange(input: TrainingsRangeQuery): Promise<Array<Training>> {
    const query = trainingsRangeSchema.parse(input)
    const rows = await this.repo.findWithPeople({
      statuses: query.includeHidden ? undefined : STATUSES_BY_FILTER.active,
      trainerId: query.trainerId,
      from: new Date(query.from),
      until: new Date(query.to),
    })
    return rows.map(toTraining)
  }

  /**
   * Marks an event as "not a training". With `applyToSameTitle`, every event
   * with the same title is ignored and the title is remembered, so later
   * imports ignore it as well. Returns the number of trainings ignored.
   */
  async ignore(input: IgnoreTrainingDto): Promise<{ updated: number }> {
    const dto = ignoreTrainingSchema.parse(input)
    const training = await this.getRow(dto.trainingId)

    let targets = [training]
    if (dto.applyToSameTitle) {
      const title = normalizeName(training.title)
      await this.repo.addIgnoredTitle(title, training.title)
      targets = (await this.repo.findAllRows()).filter(
        (t) =>
          t.status !== 'removed' &&
          t.status !== 'ignored' &&
          normalizeName(t.title) === title,
      )
    }
    for (const t of targets) {
      // oxlint-disable-next-line no-await-in-loop -- SQLite is sync anyway
      await this.repo.update(t.id, { status: 'ignored' })
    }

    this.logger.info('Trainings ignored', {
      trainingId: training.id,
      updated: targets.length,
    })
    return { updated: targets.length }
  }

  /**
   * Undoes `ignore`. If the title was remembered, the rule is dropped and all
   * events with that title come back. Restored events are `confirmed` until
   * the next import re-classifies them (e.g. back to `cancelled`).
   */
  async restore(input: RestoreTrainingDto): Promise<{ updated: number }> {
    const dto = restoreTrainingSchema.parse(input)
    const training = await this.getRow(dto.trainingId)
    const title = normalizeName(training.title)

    let targets = [training]
    if (await this.repo.removeIgnoredTitle(title)) {
      targets = (await this.repo.findAllRows()).filter(
        (t) => t.status === 'ignored' && normalizeName(t.title) === title,
      )
    }
    for (const t of targets) {
      // oxlint-disable-next-line no-await-in-loop -- SQLite is sync anyway
      await this.repo.update(t.id, { status: 'confirmed' })
    }

    this.logger.info('Trainings restored', {
      trainingId: training.id,
      updated: targets.length,
    })
    return { updated: targets.length }
  }

  private async getRow(id: number): Promise<TrainingRow> {
    const training = await this.repo.findById(id)
    if (!training) {
      throw new NotFoundException({ key: 'trainingNotFound', params: { id } })
    }
    return training
  }

  /**
   * Manually sets the client of a training. Optionally remembers the calendar
   * name as an alias and applies the choice to other unassigned trainings with
   * the same name. Returns the number of trainings updated.
   */
  async assignClient(input: AssignClientDto): Promise<{ updated: number }> {
    const dto = assignClientSchema.parse(input)
    const training = await this.getRow(dto.trainingId)
    await this.users.getRow(dto.clientId) // 404 if the client doesn't exist

    const assignment = { clientId: dto.clientId, clientAssignedManually: true }
    await this.repo.update(training.id, assignment)
    let updated = 1

    if (dto.applyToSameName && training.clientName) {
      await this.users.rememberAlias(training.clientName, dto.clientId)
      const name = normalizeName(training.clientName)
      const sameName = (await this.repo.findUnassigned()).filter(
        (t) => t.clientName && normalizeName(t.clientName) === name,
      )
      for (const t of sameName) {
        // oxlint-disable-next-line no-await-in-loop -- few rows, SQLite is sync anyway
        await this.repo.update(t.id, assignment)
        updated++
      }
    }

    this.logger.info('Training client assigned', {
      trainingId: training.id,
      clientId: dto.clientId,
      updated,
    })
    return { updated }
  }
}

const STATUSES_BY_FILTER: Record<
  TrainingStatusFilter,
  Array<TrainingRow['status']> | undefined
> = {
  active: ['confirmed', 'cancelled'],
  confirmed: ['confirmed'],
  cancelled: ['cancelled'],
  removed: ['removed'],
  ignored: ['ignored'],
  all: undefined,
}

function toTraining({
  training,
  trainer,
  client,
}: TrainingWithPeople): Training {
  return {
    id: training.id,
    startsAt: training.startsAt.toISOString(),
    endsAt: training.endsAt.toISOString(),
    status: training.status,
    title: training.title,
    clientName: training.clientName,
    location: training.location,
    notes: training.notes,
    trainer,
    client: client?.id != null ? client : null,
    clientAssignedManually: training.clientAssignedManually,
  }
}
