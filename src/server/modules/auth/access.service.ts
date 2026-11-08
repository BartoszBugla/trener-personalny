import { inject, injectable } from 'inversify'

import {
  BadRequestException,
  ConflictException,
} from '../../core/errors/http-exceptions'
import { LoggerService } from '../../core/logger/logger.service'
import { UsersRepository } from '../users/users.repository'
import { UsersService, toUser } from '../users/users.service'
import { FirebaseAdminService } from './firebase-admin.service'
import type { AuthUser } from '#/shared/auth/auth.dto'
import {
  createAppUserSchema,
  grantAccessSchema,
  userIdSchema,
} from '#/shared/users/users.dto'
import type {
  CreateAppUserDto,
  GrantAccessDto,
  User,
} from '#/shared/users/users.dto'
import { normalizeName } from '#/shared/users/normalize-name'

/**
 * Who may sign in: app users are people with `appAccess` (+ email); clients
 * ("podopieczni") have no account until given access with an email.
 *
 * No roles yet – every app user sees all data.
 */
@injectable()
export class AccessService {
  constructor(
    @inject(UsersRepository) private readonly repo: UsersRepository,
    @inject(UsersService) private readonly users: UsersService,
    @inject(FirebaseAdminService)
    private readonly firebase: FirebaseAdminService,
    @inject(LoggerService) private readonly logger: LoggerService,
  ) {}

  /** Adds an app user by hand. */
  async createAppUser(input: CreateAppUserDto): Promise<User> {
    const dto = createAppUserSchema.parse(input)
    await this.assertEmailFree(dto.email)
    const row = await this.repo.create({
      name: dto.name,
      normalizedName: normalizeName(dto.name),
      email: dto.email,
      isTrainer: dto.isTrainer,
      appAccess: true,
    })
    this.logger.info('App user created', { id: row.id })
    await this.prepareFirebaseAccount(dto.email)
    return toUser(row)
  }

  /** Turns a client into an app user (sets their sign-in email). */
  async grantAccess(input: GrantAccessDto): Promise<User> {
    const dto = grantAccessSchema.parse(input)
    const user = await this.users.getRow(dto.id)
    await this.assertEmailFree(dto.email, user.id)
    const row = await this.repo.update(user.id, {
      email: dto.email,
      appAccess: true,
    })
    this.logger.info('App access granted', { id: user.id })
    await this.prepareFirebaseAccount(dto.email)
    return toUser(row ?? user)
  }

  /**
   * Takes app access away (the person stays, as a client or trainer). Their
   * sessions end on the next request. You can't revoke your own access.
   */
  async revokeAccess(input: { id: number }, actor: AuthUser): Promise<User> {
    const { id } = userIdSchema.parse(input)
    const user = await this.users.getRow(id)
    if (user.email && user.email === actor.email) {
      throw new BadRequestException({ key: 'cannotRevokeOwnAccess' })
    }
    const row = await this.repo.update(id, { appAccess: false })
    this.logger.info('App access revoked', { id })
    return toUser(row ?? user)
  }

  /** Whether `email` belongs to an app user (sign-in check). */
  async hasAccess(email: string): Promise<boolean> {
    const user = await this.repo.findByEmail(email.toLowerCase())
    return Boolean(user?.appAccess)
  }

  private async assertEmailFree(email: string, exceptUserId?: number) {
    const owner = await this.repo.findByEmail(email)
    if (owner && owner.id !== exceptUserId) {
      throw new ConflictException({
        key: 'emailUsedBy',
        params: { email, name: owner.name },
      })
    }
  }

  /** Best effort: the app user can still sign in with Google without it. */
  private async prepareFirebaseAccount(email: string) {
    if (!this.firebase.isConfigured) return
    try {
      if (await this.firebase.ensureUser(email)) {
        this.logger.info('Firebase account created', { email })
      }
    } catch (error) {
      this.logger.warn('Could not create Firebase account', {
        email,
        error: String(error),
      })
    }
  }
}
