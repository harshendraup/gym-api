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

export default class TenantMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const { auth, params } = ctx

    const user = await auth.authenticate()

    const gymId = (params.gymId as string | undefined) ?? user.gymId ?? null

    if (!gymId) {
      throw new TenantException('Gym context is required. Please include gymId.')
    }

    // super_admin can access any gym
    if (user.role !== 'super_admin' && user.gymId !== gymId) {
      throw new TenantException('Access denied to this gym.')
    }

    const gym = await Gym.query().where('id', gymId).whereNull('deleted_at').firstOrFail()

    ctx.gym = gym
    ctx.gymId = gymId

    return next()
  }
}
