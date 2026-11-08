import { inject, injectable } from 'inversify'

import { ConfigService } from '../config/config.service'

const LEVELS = ['debug', 'info', 'warn', 'error'] as const
type Level = (typeof LEVELS)[number]

/** Minimal structured logger. Swap the implementation for pino/winston later. */
@injectable()
export class LoggerService {
  private readonly minLevel: number

  constructor(@inject(ConfigService) config: ConfigService) {
    this.minLevel = LEVELS.indexOf(config.get('LOG_LEVEL'))
  }

  debug(message: string, meta?: Record<string, unknown>) {
    this.log('debug', message, meta)
  }
  info(message: string, meta?: Record<string, unknown>) {
    this.log('info', message, meta)
  }
  warn(message: string, meta?: Record<string, unknown>) {
    this.log('warn', message, meta)
  }
  error(message: string, meta?: Record<string, unknown>) {
    this.log('error', message, meta)
  }

  private log(level: Level, message: string, meta?: Record<string, unknown>) {
    if (LEVELS.indexOf(level) < this.minLevel) return
    const line = `[${new Date().toISOString()}] ${level.toUpperCase()} ${message}`
    console[level === 'debug' ? 'log' : level](line, meta ?? '')
  }
}
