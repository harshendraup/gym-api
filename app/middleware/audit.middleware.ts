import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import emitter from '@adonisjs/core/services/emitter'

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

/**
 * Automatically emits audit events for all state-changing requests.
 * Actual log writing is done async via the audit event listener.
 */
export default class AuditMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    if (!MUTATION_METHODS.has(ctx.request.method())) {
      return next()
    }

    await next()

    // Only log successful mutations
    if (ctx.response.getStatus() >= 200 && ctx.response.getStatus() < 300) {
      emitter.emit('audit:log', {
        gymId: ctx['gymId'] ?? null,
        actorId: ctx.auth.user?.id ?? null,
        actorRole: ctx['currentRole'] ?? null,
        action: `${ctx.request.method().toLowerCase()}.${ctx.route?.name ?? ctx.request.url()}`,
        entityType: null,
        entityId: null,
        ipAddress: ctx.request.ip(),
        userAgent: ctx.request.header('user-agent') ?? null,
      })
    }
  }
}
