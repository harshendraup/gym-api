import { HttpContext, ExceptionHandler } from '@adonisjs/core/http'
import { errors as vineErrors } from '@vinejs/vine'
import type { Exception } from '@adonisjs/core/exceptions'
import { AppError } from './app_error.js'

export default class HttpExceptionHandler extends ExceptionHandler {
  protected debug = true
  protected ignoreCodes = ['E_ROUTE_NOT_FOUND']

  async handle(error: Exception & { statusCode?: number }, ctx: HttpContext) {
    const { response } = ctx

    // ── 1. VineJS validation errors → 422 ──────────────────────────────────
    if (error instanceof vineErrors.E_VALIDATION_ERROR) {
      const fields = (error.messages as any[]).map((m) => ({
        field: m.field,
        message: m.message,
      }))

      return response.unprocessableEntity({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          errors: fields,
        },
      })
    }

    // ── 2. Custom AppError (thrown anywhere in the codebase) ───────────────
    if (error instanceof AppError) {
      return response.status(error.statusCode).send({
        success: false,
        error: {
          code: error.code,
          message: error.message,
          stack: error.stack,
        },
      })
    }

    // ── 3. Map HTTP status codes to consistent responses ───────────────────
    const status = error.status ?? (error as any).statusCode ?? 500

    if (status === 400) {
      return response.badRequest({
        success: false,
        error: { code: 'BAD_REQUEST', message: error.message || 'Bad request' },
      })
    }

    if (status === 401) {
      return response.unauthorized({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      })
    }

    if (status === 403) {
      return response.forbidden({
        success: false,
        error: { code: 'FORBIDDEN', message: error.message || 'Insufficient permissions' },
      })
    }

    if (status === 404) {
      return response.notFound({
        success: false,
        error: { code: 'NOT_FOUND', message: error.message || 'Resource not found' },
      })
    }

    if (status === 409) {
      return response.conflict({
        success: false,
        error: { code: 'CONFLICT', message: error.message || 'Resource conflict' },
      })
    }

    if (status === 422) {
      return response.unprocessableEntity({
        success: false,
        error: { code: 'UNPROCESSABLE', message: error.message || 'Unprocessable entity' },
      })
    }

    if (status === 429) {
      return response.tooManyRequests({
        success: false,
        error: { code: 'RATE_LIMITED', message: 'Too many requests. Please slow down.' },
      })
    }

    // ── 4. Fallback — unexpected 500 errors ────────────────────────────────
    return response.internalServerError({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message,
        stack: error.stack,
      },
    })
  }

  async report(error: Exception, ctx: HttpContext) {
    if (!this.shouldReport(error)) return
    return super.report(error, ctx)
  }
}
