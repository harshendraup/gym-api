import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

export type GymRole = 'super_admin' | 'gym_owner' | 'trainer' | 'staff' | 'member'

/**
 * Role-based access control middleware.
 * Usage in routes: middleware: [rbac(['gym_owner', 'staff'])]
 */
export default class RbacMiddleware {
  constructor(private allowedRoles: GymRole[]) {}

  async handle(ctx: HttpContext, next: NextFn) {
    const { auth, gymId, response } = ctx

    const user = auth.getUserOrFail()

    // Super admin bypasses all gym-level checks
    const isSuperAdmin = await user
      .related('gymRoles')
      .query()
      .where('role', 'super_admin')
      .where('is_active', true)
      .first()

    if (isSuperAdmin) return next()

    // Verify user role within this gym
    const userRole = await user
      .related('gymRoles')
      .query()
      .where('gym_id', gymId)
      .where('is_active', true)
      .first()

    if (!userRole || !this.allowedRoles.includes(userRole.role as GymRole)) {
      return response.forbidden({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: `This action requires one of: ${this.allowedRoles.join(', ')}`,
        },
      })
    }

    // Attach current role to context for downstream use
    ctx['currentRole'] = userRole.role

    return next()
  }
}

export function rbac(roles: GymRole[]) {
  return new RbacMiddleware(roles)
}
