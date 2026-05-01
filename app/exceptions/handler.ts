import app from '@adonisjs/core/services/app'
import { HttpContext, ExceptionHandler } from '@adonisjs/core/http'
import { errors as vineErrors } from '@vinejs/vine'
import type { Exception } from '@adonisjs/core/exceptions'

export default class HttpExceptionHandler extends ExceptionHandler {
  protected debug = !app.inProduction

  protected ignoreCodes = ['E_ROUTE_NOT_FOUND']

  async handle(error: Exception, ctx: HttpContext) {
    // VineJS validation errors → 422
    if (error instanceof vineErrors.E_VALIDATION_ERROR) {
      return ctx.response.unprocessableEntity({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          fields: error.messages,
        },
      })
    }

    // AdonisJS auth errors → 401
    if (error.status === 401) {
      return ctx.response.unauthorized({
        success: false,
        error: { code: 'UNAUTHORIZED', message: error.message || 'Authentication required' },
      })
    }

    // 403 Forbidden
    if (error.status === 403) {
      return ctx.response.forbidden({
        success: false,
        error: { code: 'FORBIDDEN', message: error.message || 'Insufficient permissions' },
      })
    }

    // 404 Not Found
    if (error.status === 404) {
      return ctx.response.notFound({
        success: false,
        error: { code: 'NOT_FOUND', message: error.message || 'Resource not found' },
      })
    }

    // Unknown errors → 500
    return ctx.response.internalServerError({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: app.inProduction ? 'An unexpected error occurred' : error.message,
        ...(this.debug && { stack: error.stack }),
      },
    })
  }

  async report(error: Exception, ctx: HttpContext) {
    if (!this.shouldReport(error)) return
    return super.report(error, ctx)
  }
}
