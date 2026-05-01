import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const AuthController = () => import('#controllers/auth/auth.controller')

router
  .group(() => {
    // Public routes — no auth required
    router.post('/otp/request', [AuthController, 'requestOtp']).as('auth.otp.request')
    router.post('/otp/verify', [AuthController, 'verifyOtp']).as('auth.otp.verify')
    router.post('/login', [AuthController, 'login']).as('auth.login')
    router.post('/refresh', [AuthController, 'refresh']).as('auth.refresh')

    // Protected routes
    router
      .group(() => {
        router.post('/logout', [AuthController, 'logout']).as('auth.logout')
        router.get('/me', [AuthController, 'me']).as('auth.me')
      })
      .use(middleware.auth())
  })
  .prefix('/api/v1/auth')
