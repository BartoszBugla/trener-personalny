import { inject, injectable } from 'inversify'

import {
  ConflictException,
  NotFoundException,
} from '../../core/errors/http-exceptions'
import { LoggerService } from '../../core/logger/logger.service'
import { loadPage } from '../../core/pagination'
import { UsersRepository } from './users.repository'
import type { UserRow } from './users.table'
import { normalizeName } from '#/shared/users/normalize-name'
import { listUsersSchema } from '#/shared/users/users.dto'
import type {
  CreateUserValues,
  ListUsersSearch,
  UpdateUserDto,
  User,
  UsersPage,
} from '#/shared/users/users.dto'

export type ClientMatch =
  | { status: 'matched'; user: UserRow }
  | { status: 'created'; user: UserRow }
  | { status: 'unresolved'; reason: 'empty' | 'ambiguous' | 'not-confident' }

@injectable()
export class UsersService {
  constructor(
    @inject(UsersRepository) private readonly repo: UsersRepository,
    @inject(LoggerService) private readonly logger: LoggerService,
  ) {}

  async findAll(): Promise<Array<User>> {
    const rows = await this.repo.findAll()
    return rows.map(toUser)
  }

  /** Filtered, sorted, paginated list for the users screen. */
  async list(input: ListUsersSearch, now = new Date()): Promise<UsersPage> {
    const query = listUsersSchema.parse(input)
    const filter = {
      group: query.group,
      role: query.role,
      noPhone: query.noPhone,
      name: query.q ? normalizeName(query.q) || undefined : undefined,
      contact: query.q?.toLowerCase(),
    }
    const { rows, total, page, pageCount } = await loadPage(
      query.page,
      query.pageSize,
      (offset, limit) =>
        this.repo.findPageWithStats(filter, {
          offset,
          limit,
          sortBy: query.sortBy,
          sort: query.sort,
          now,
        }),
    )
    return {
      items: rows.map((r) => ({
        ...toUser(r.user),
        trainingCount: r.trainingCount,
        lastTrainingAt: r.lastTrainingAt?.toISOString() ?? null,
      })),
      total,
      page,
      pageSize: query.pageSize,
      pageCount,
    }
  }

  async findOne(id: number): Promise<User> {
    return toUser(await this.getRow(id))
  }

  async getRow(id: number): Promise<UserRow> {
    const row = await this.repo.findById(id)
    if (!row)
      throw new NotFoundException({ key: 'userNotFound', params: { id } })
    return row
  }

  async create(dto: CreateUserValues): Promise<User> {
    if (dto.email && (await this.repo.findByEmail(dto.email))) {
      throw new ConflictException({
        key: 'emailInUse',
        params: { email: dto.email },
      })
    }
    if (dto.phone && (await this.repo.findByPhone(dto.phone))) {
      throw new ConflictException({
        key: 'phoneInUse',
        params: { phone: dto.phone },
      })
    }
    const row = await this.repo.create({
      name: dto.name,
      normalizedName: normalizeName(dto.name),
      email: dto.email ?? null,
      phone: dto.phone ?? null,
      isTrainer: dto.isTrainer,
    })
    this.logger.info('User created', { id: row.id, isTrainer: row.isTrainer })
    return toUser(row)
  }

  async update({ id, ...changes }: UpdateUserDto): Promise<User> {
    const row = await this.repo.update(id, changes)
    if (!row)
      throw new NotFoundException({ key: 'userNotFound', params: { id } })
    return toUser(row)
  }

  /**
   * Finds the trainer owning a calendar by email; creates them (or promotes an
   * existing user to trainer) when needed.
   */
  async ensureTrainer(
    email: string,
    name: string,
  ): Promise<{ user: UserRow; created: boolean }> {
    const existing = await this.repo.findByEmail(email)
    if (existing) {
      if (existing.isTrainer) return { user: existing, created: false }
      const promoted = await this.repo.update(existing.id, { isTrainer: true })
      return { user: promoted ?? existing, created: false }
    }
    const user = await this.repo.create({
      name,
      normalizedName: normalizeName(name),
      email,
      isTrainer: true,
    })
    this.logger.info('Trainer created from calendar', { id: user.id, email })
    return { user, created: true }
  }

  /**
   * Resolves a client name taken from a calendar entry to a user:
   * 1. a remembered alias (from an earlier manual assignment),
   * 2. exactly one user with the same normalized name,
   * 3. a new client – but only for a full name ("First Last").
   * Anything else (single word like "Ania", several candidates) stays
   * unresolved and must be assigned manually.
   */
  /**
   * Trainer known only by name (shared calendar without an owner email):
   * reuses the user with that normalized name – preferring an existing
   * trainer – or creates one.
   */
  async ensureTrainerByName(
    name: string,
  ): Promise<{ user: UserRow; created: boolean }> {
    const normalized = normalizeName(name)
    const candidates = await this.repo.findByNormalizedName(normalized)
    const existing = candidates.find((u) => u.isTrainer) ?? candidates[0]
    if (existing) {
      if (existing.isTrainer) return { user: existing, created: false }
      const promoted = await this.repo.update(existing.id, { isTrainer: true })
      return { user: promoted ?? existing, created: false }
    }
    const user = await this.repo.create({
      name,
      normalizedName: normalized,
      isTrainer: true,
    })
    this.logger.info('Trainer created from calendar', { id: user.id, name })
    return { user, created: true }
  }

  async resolveClient(
    clientName: string | null,
    options: {
      excludeUserId?: number
      /** `false` = only match existing users, never create one. */
      allowCreate?: boolean
    } = {},
  ): Promise<ClientMatch> {
    const normalized = clientName ? normalizeName(clientName) : ''
    if (!clientName || !normalized) {
      return { status: 'unresolved', reason: 'empty' }
    }

    const aliased = await this.repo.findByAlias(normalized)
    if (aliased) return { status: 'matched', user: aliased }

    const candidates = (
      await this.repo.findByNormalizedName(normalized)
    ).filter((u) => u.id !== options.excludeUserId)
    if (candidates.length === 1) {
      return { status: 'matched', user: candidates[0] }
    }
    if (candidates.length > 1) {
      return { status: 'unresolved', reason: 'ambiguous' }
    }

    if (
      options.allowCreate === false ||
      !isConfidentFullName(clientName, normalized)
    ) {
      return { status: 'unresolved', reason: 'not-confident' }
    }
    const user = await this.repo.create({
      name: clientName,
      normalizedName: normalized,
    })
    this.logger.info('Client created from calendar', { id: user.id })
    return { status: 'created', user }
  }

  /** Remembers `name` as an alternative name of `userId`. */
  async rememberAlias(name: string, userId: number): Promise<void> {
    const alias = normalizeName(name)
    if (alias) await this.repo.upsertAlias(alias, userId)
  }
}

/** Words that make a title something other than a person's name. */
const NOT_A_NAME_WORDS = new Set([
  // conjunctions / prepositions: "Tomek i Anna", "Trening z Maćkiem"
  'i',
  'z',
  'oraz',
  'do',
  'na',
  'w',
  'u',
  'od',
  'za',
  'po',
  // relatives: "Mama Patrycji", "Żona Kamila"
  'mama',
  'tata',
  'zona',
  'maz',
  'corka',
  'syn',
  'brat',
  'siostra',
  'babcia',
  'dziadek',
  'dziewczyna',
  'chlopak',
  'kolega',
  'kolezanka',
  'dzieci',
  // titles / generic words
  'pan',
  'pani',
  'dr',
  'grupa',
  'trening',
  'plan',
  'osoba',
  'nowa',
  'nowy',
  // contact / admin notes: "Tomek sms", "Mail mosir", "Kasa fiskalna"
  'telefon',
  'tel',
  'sms',
  'mail',
  'lista',
  'strona',
  'kasa',
])

/**
 * Safe to auto-create a client: 2–3 words of letters only, each at least two
 * letters long ("Anna Nowak", "Anna-Maria Nowak"). Initials ("Kasia M"),
 * pairs ("Fryderyk + Filip"), relatives ("Mama Patrycji") and anything with
 * digits or symbols go to manual assignment instead.
 */
function isConfidentFullName(name: string, normalized: string): boolean {
  if (/[^\p{L}\s'-]/u.test(name)) return false
  const words = normalized.split(' ')
  return (
    words.length >= 2 &&
    words.length <= 3 &&
    words.every((w) => w.length > 1 && !NOT_A_NAME_WORDS.has(w))
  )
}

export function toUser(row: UserRow): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    isTrainer: row.isTrainer,
    appAccess: row.appAccess,
    createdAt: row.createdAt.toISOString(),
  }
}
