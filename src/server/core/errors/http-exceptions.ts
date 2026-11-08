import { translate } from '#/i18n/config'
import type { ErrorKey } from '#/i18n/locales/en'

/** Translatable error: a key from `errors.*` in the locale files + params. */
export interface ErrorMessage {
  key: ErrorKey
  params?: Record<string, string | number>
}

/**
 * Nest-like exceptions. Throw them from services; server functions translate
 * them (see `src/lib/server-fn/middleware.ts`). With an `ErrorMessage` the
 * message is English by default and gets translated to the user's language
 * by the exception-filter middleware.
 */
export class HttpException extends Error {
  readonly i18n?: ErrorMessage

  constructor(
    message: string | ErrorMessage,
    readonly status: number,
  ) {
    super(
      typeof message === 'string'
        ? message
        : translate('en', `errors.${message.key}`, message.params),
    )
    this.name = new.target.name
    if (typeof message !== 'string') this.i18n = message
  }
}

export class BadRequestException extends HttpException {
  constructor(message: string | ErrorMessage = 'Bad Request') {
    super(message, 400)
  }
}

export class UnauthorizedException extends HttpException {
  constructor(message: string | ErrorMessage = 'Unauthorized') {
    super(message, 401)
  }
}

export class ForbiddenException extends HttpException {
  constructor(message: string | ErrorMessage = 'Forbidden') {
    super(message, 403)
  }
}

export class ServiceUnavailableException extends HttpException {
  constructor(message: string | ErrorMessage = 'Service Unavailable') {
    super(message, 503)
  }
}

export class NotFoundException extends HttpException {
  constructor(message: string | ErrorMessage = 'Not Found') {
    super(message, 404)
  }
}

export class ConflictException extends HttpException {
  constructor(message: string | ErrorMessage = 'Conflict') {
    super(message, 409)
  }
}
