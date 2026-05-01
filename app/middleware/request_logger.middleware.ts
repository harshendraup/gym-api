import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

export default class RequestLoggerMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const start = Date.now()
    await next()
    const ms = Date.now() - start
    const status = ctx.response.getStatus()
    ctx.logger.info(
      { method: ctx.request.method(), url: ctx.request.url(), status, ms },
      `${ctx.request.method()} ${ctx.request.url()} ${status} - ${ms}ms`
    )
  }
}
