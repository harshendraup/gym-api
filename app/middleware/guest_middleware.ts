import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

export default class GuestMiddleware {
  async handle({ auth, response }: HttpContext, next: NextFn) {
    const isAuthenticated = await auth.check()
    if (isAuthenticated) {
      return response.conflict({ success: false, error: { code: 'ALREADY_AUTHENTICATED', message: 'Already authenticated' } })
    }
    await next()
  }
}
