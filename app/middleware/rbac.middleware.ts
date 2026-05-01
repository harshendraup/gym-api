import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

export type GymRole = 'super_admin' | 'gym_owner' | 'trainer' | 'staff' | 'member'

declare module '@adonisjs/core/http' {
  interface HttpContext {
    currentRole?: GymRole
  }
}

export default class RbacMiddleware {
  async handle(ctx: HttpContext, next: NextFn, allowedRoles: GymRole[]) {
    const { auth, gymId, response } = ctx

    const user = await auth.authenticate()

    const isSuperAdmin = await user
      .related('gymRoles')
      .query()
      .where('role', 'super_admin')
      .where('is_active', true)
      .first()

    if (isSuperAdmin) return next()

    const userRole = await user
      .related('gymRoles')
      .query()
      .where('gym_id', gymId)
      .where('is_active', true)
      .first()

    if (!userRole || !allowedRoles.includes(userRole.role as GymRole)) {
      return response.forbidden({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: `This action requires one of: ${allowedRoles.join(', ')}`,
        },
      })
    }

    ctx.currentRole = userRole.role as GymRole

    return next()
  }
}
