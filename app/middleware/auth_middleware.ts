import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

export default class AuthMiddleware {
  async handle({ auth, response }: HttpContext, next: NextFn) {
    try {
      await auth.authenticate()
    } catch {
      return response.unauthorized({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } })
    }
    await next()
  }
}
