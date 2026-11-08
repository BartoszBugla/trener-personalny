import { sql } from 'drizzle-orm'
import { inject, injectable } from 'inversify'

import { ConfigService } from '../../core/config/config.service'
import type { DB } from '../../core/database/database.module'
import { TOKENS } from '../../core/di/tokens'

export interface SystemInfo {
  status: 'ok' | 'degraded'
  database: 'up' | 'down'
  environment: string
  nodeVersion: string
  uptimeSeconds: number
  renderedAt: string
}

/** Health / runtime info – exposed at `GET /api/health` (monitoring, deploys). */
@injectable()
export class SystemService {
  constructor(
    @inject(TOKENS.Database) private readonly db: DB,
    @inject(ConfigService) private readonly config: ConfigService,
  ) {}

  async getInfo(): Promise<SystemInfo> {
    const database = await this.pingDatabase()
    return {
      status: database === 'up' ? 'ok' : 'degraded',
      database,
      environment: this.config.get('NODE_ENV'),
      nodeVersion: process.version,
      uptimeSeconds: Math.round(process.uptime()),
      renderedAt: new Date().toISOString(),
    }
  }

  private async pingDatabase(): Promise<'up' | 'down'> {
    try {
      await this.db.run(sql`select 1`)
      return 'up'
    } catch {
      return 'down'
    }
  }
}
