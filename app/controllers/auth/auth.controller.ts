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
    const payload = await request.validateUsing(requestOtpValidator)

    if (!payload.email && !payload.phone) {
      return response.badRequest({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'email or phone is required' },
      })
    }

    try {
      const result = await authService.requestOtpForLogin({
        businessId: payload.business_id,
        role: payload.role,
        email: payload.email,
        phone: payload.phone,
      })
      return response.ok({
        success: true,
        data: {
          message: 'OTP sent successfully',
          ...(result.devOtp && { otp: result.devOtp, note: 'DEV mode only — not shown in production' }),
        },
      })
    } catch (error: any) {
      if (error.message === 'OTP_NOT_ALLOWED') {
        return response.forbidden({
          success: false,
          error: { code: 'OTP_NOT_ALLOWED', message: 'OTP login is allowed only for member role' },
        })
      }
      if (error.message === 'MEMBER_NOT_FOUND') {
        return response.notFound({
          success: false,
          error: { code: 'MEMBER_NOT_FOUND', message: 'No member found for provided business and identity' },
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
   * POST /api/v1/auth/otp/verify
   * Verify OTP and get tokens
   */
  async verifyOtp({ request, response }: HttpContext) {
    const payload = await request.validateUsing(verifyOtpValidator)

    if (!payload.email && !payload.phone) {
      return response.badRequest({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'email or phone is required' },
      })
    }

    try {
      const result = await authService.verifyOtpAndLoginForRole({
        email: payload.email,
        phone: payload.phone,
        otp: payload.otp,
      })
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
      if (error.message === 'MEMBER_NOT_FOUND') {
        return response.notFound({
          success: false,
          error: { code: 'MEMBER_NOT_FOUND', message: 'No member found for provided business and identity' },
        })
      }
      if (error.message === 'ACCOUNT_DISABLED') {
        return response.forbidden({
          success: false,
          error: { code: 'ACCOUNT_DISABLED', message: 'Account has been disabled' },
        })
      }
      if (
        error.message === 'OTP_EXPIRED' ||
        error.message === 'OTP_INVALID' ||
        error.message === 'OTP_LOCKED_OUT' ||
        error.message === 'OTP_MAX_ATTEMPTS_EXCEEDED'
      ) {
        return response.unprocessableEntity({
          success: false,
          error: { code: error.message, message: 'Invalid or expired OTP' },
        })
      }
      throw error
    }
  }

  /**
   * POST /api/v1/auth/login
   * Email + password login (for admin dashboard)
   */
  async login({ request, response }: HttpContext) {
    const payload = await request.validateUsing(loginValidator)
    const role = payload.role
    const isGlobalRole = role === 'super_admin' || role === 'admin'

    if (!payload.email && !payload.phone) {
      return response.badRequest({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'email or phone is required' },
      })
    }
    if (role && !payload.business_id && !isGlobalRole) {
      return response.badRequest({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'business_id is required for this role' },
      })
    }

    try {
      if (!payload.password && role === 'member') {
        if (!payload.business_id) {
          return response.badRequest({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'business_id is required for member OTP login' },
          })
        }
        const otpResult = await authService.requestOtpForLogin({
          businessId: payload.business_id,
          role,
          email: payload.email,
          phone: payload.phone,
        })

        return response.ok({
          success: true,
          data: {
            requiresOtp: true,
            message: 'OTP sent successfully',
            ...(otpResult.devOtp && { otp: otpResult.devOtp, note: 'DEV mode only — not shown in production' }),
          },
        })
      }

      if (!payload.password) {
        return response.badRequest({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'password is required when role is not provided' },
        })
      }

      const result = role
        ? await authService.loginWithRole({
            businessId: payload.business_id,
            role,
            email: payload.email,
            phone: payload.phone,
            password: payload.password,
          })
        : await authService.loginWithoutRole({
            email: payload.email,
            phone: payload.phone,
            password: payload.password,
          })
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
      if (error.message === 'OTP_NOT_ALLOWED') {
        return response.forbidden({
          success: false,
          error: { code: 'OTP_NOT_ALLOWED', message: 'OTP login is allowed only for member role' },
        })
      }
      if (error.message === 'MEMBER_NOT_FOUND') {
        return response.notFound({
          success: false,
          error: { code: 'MEMBER_NOT_FOUND', message: 'No member found for provided business and identity' },
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
