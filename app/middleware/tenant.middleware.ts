import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import Gym from '#models/gym.model'
import { TenantException } from '#exceptions/tenant.exception'

declare module '@adonisjs/core/http' {
  interface HttpContext {
    gym: Gym
    gymId: string
  }
}

/**
 * Resolves the current gym (tenant) from the authenticated user's JWT claim
 * and injects it into HttpContext for all downstream handlers.
 *
 * Every repository query uses ctx.gymId — this is the primary multi-tenant guard.
 */
export default class TenantMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const { auth, params } = ctx

    await auth.authenticate()

    // gymId can come from:
    // 1. Route param      — /api/v1/gyms/:gymId/members
    // 2. JWT claim        — token issued with gym_id after gym selection
    // 3. User's sole gym  — if user belongs to exactly one gym

    const gymIdFromParam = params.gymId as string | undefined
    const gymIdFromToken = auth.user?.['gymId'] as string | undefined

    const gymId = gymIdFromParam ?? gymIdFromToken

    if (!gymId) {
      throw new TenantException('Gym context is required. Please include gymId.')
    }

    // Verify the authenticated user actually belongs to this gym
    const user = auth.getUserOrFail()
    const role = await user
      .related('gymRoles')
      .query()
      .where('gym_id', gymId)
      .where('is_active', true)
      .first()

    if (!role) {
      throw new TenantException('Access denied to this gym.')
    }

    const gym = await Gym.query()
      .where('id', gymId)
      .whereNull('deleted_at')
      .firstOrFail()

    ctx.gym = gym
    ctx.gymId = gymId

    return next()
  }
}
