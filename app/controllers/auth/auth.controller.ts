import type { HttpContext } from '@adonisjs/core/http'
import { AuthService } from '#services/auth.service'
import { requestOtpValidator, verifyOtpValidator, loginValidator, refreshTokenValidator } from '#validators/auth.validator'

const authService = new AuthService()

export default class AuthController {
  /**
   * POST /api/v1/auth/otp/request
   * Request mobile OTP
   */
  async requestOtp({ request, response }: HttpContext) {
    const { phone } = await request.validateUsing(requestOtpValidator)
    await authService.requestOtp(phone)
    return response.ok({ success: true, data: { message: 'OTP sent successfully' } })
  }

  /**
   * POST /api/v1/auth/otp/verify
   * Verify OTP and get tokens
   */
  async verifyOtp({ request, response }: HttpContext) {
    const { phone, otp } = await request.validateUsing(verifyOtpValidator)
    const result = await authService.verifyOtpAndLogin(phone, otp)
    return response.ok({
      success: true,
      data: {
        user: result.user.serialize(),
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
        expiresIn: result.tokens.expiresIn,
        gymContext: result.gymContext,
      },
    })
  }

  /**
   * POST /api/v1/auth/login
   * Email + password login (for admin dashboard)
   */
  async login({ request, response }: HttpContext) {
    const { email, password } = await request.validateUsing(loginValidator)

    try {
      const result = await authService.loginWithPassword(email, password)
      return response.ok({
        success: true,
        data: {
          user: result.user.serialize(),
          accessToken: result.tokens.accessToken,
          refreshToken: result.tokens.refreshToken,
          expiresIn: result.tokens.expiresIn,
          gymContext: result.gymContext,
        },
      })
    } catch (error: any) {
      if (error.message === 'INVALID_CREDENTIALS') {
        return response.unauthorized({
          success: false,
          error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
        })
      }
      if (error.message === 'ACCOUNT_DISABLED') {
        return response.forbidden({
          success: false,
          error: { code: 'ACCOUNT_DISABLED', message: 'Account has been disabled' },
        })
      }
      throw error
    }
  }

  /**
   * POST /api/v1/auth/refresh
   * Refresh access token
   */
  async refresh({ request, response }: HttpContext) {
    const { refreshToken } = await request.validateUsing(refreshTokenValidator)

    try {
      const tokens = await authService.refreshTokens(refreshToken)
      return response.ok({ success: true, data: tokens })
    } catch {
      return response.unauthorized({
        success: false,
        error: { code: 'INVALID_REFRESH_TOKEN', message: 'Refresh token is invalid or expired' },
      })
    }
  }

  /**
   * POST /api/v1/auth/logout
   */
  async logout({ request, response }: HttpContext) {
    const { refreshToken } = await request.validateUsing(refreshTokenValidator)
    await authService.logout(refreshToken)
    return response.ok({ success: true, data: { message: 'Logged out successfully' } })
  }

  /**
   * GET /api/v1/auth/me
   */
  async me({ auth, response }: HttpContext) {
    const user = auth.getUserOrFail()
    await user.load('gymRoles')
    return response.ok({ success: true, data: user.serialize() })
  }
}
