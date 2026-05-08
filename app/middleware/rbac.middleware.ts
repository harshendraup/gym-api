import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

export type GymRole = 'super_admin' | 'admin' | 'manager' | 'gym_owner' | 'trainer' | 'staff' | 'member'

declare module '@adonisjs/core/http' {
  interface HttpContext {
    currentRole?: GymRole
  }
}

export default class RbacMiddleware {
  async handle(ctx: HttpContext, next: NextFn, allowedRoles: GymRole[]) {
    const { auth, response } = ctx

    const user = await auth.authenticate()

    if (user.role === 'super_admin') return next()

    if (!allowedRoles.includes(user.role as GymRole)) {
      return response.forbidden({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: `This action requires one of: ${allowedRoles.join(', ')}`,
        },
      })
    }

    ctx.currentRole = user.role as GymRole

    return next()
  }
}
