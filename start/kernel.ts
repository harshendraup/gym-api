import router from '@adonisjs/core/services/router'
import server from '@adonisjs/core/services/server'

/**
 * The error handler is used to convert an exception into a HTTP response.
 */
server.errorHandler(() => import('#exceptions/handler'))

/**
 * The named middleware collection must be explicitly assigned to
 * routes or router groups.
 */
export const middleware = router.named({
  auth: () => import('#middleware/auth_middleware'),
  tenant: () => import('#middleware/tenant.middleware'),
  guest: () => import('#middleware/guest_middleware'),
})

/**
 * Global middleware stack — runs on every HTTP request.
 */
server.use([
  () => import('@adonisjs/core/bodyparser_middleware'),
  () => import('@adonisjs/cors/cors_middleware'),
  () => import('@adonisjs/static/static_middleware'),
])

/**
 * Named middleware used on specific routes.
 */
router.use([() => import('#middleware/audit.middleware')])
