import { Exception } from '@adonisjs/core/exceptions'
import type { HttpContext } from '@adonisjs/core/http'

export class TenantException extends Exception {
  static status = 403
  static code = 'TENANT_ACCESS_DENIED'

  async handle(error: this, ctx: HttpContext) {
    ctx.response.status(403).send({
      success: false,
      error: {
        code: TenantException.code,
        message: error.message,
      },
    })
  }
}
