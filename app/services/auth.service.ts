import redis from '@adonisjs/redis/services/main'
import User from '#models/user.model'
import UserGymRole from '#models/user_gym_role.model'
import { generateOtp, generateRefreshToken } from '#helpers/crypto.helper'
import { OtpService } from './otp.service.js'
import { DateTime } from 'luxon'

interface TokenPair {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

interface LoginResult {
  user: User
  tokens: TokenPair
  gymContext: { gymId: string; role: string } | null
}

export class AuthService {
  private otpService = new OtpService()

  // -------------------------------------------------------------------------
  // OTP Flow
  // -------------------------------------------------------------------------

  async requestOtp(phone: string): Promise<void> {
    const otp = generateOtp()
    await this.otpService.storeOtp(phone, otp)
    await this.otpService.sendSms(phone, otp)
  }

  async verifyOtpAndLogin(phone: string, otp: string): Promise<LoginResult> {
    await this.otpService.verifyOtp(phone, otp)

    let user = await User.findBy('phone', phone)
    if (!user) {
      user = await User.create({
        phone,
        fullName: 'Member',
        isPhoneVerified: true,
      })
    } else {
      user.isPhoneVerified = true
      user.lastLoginAt = DateTime.now()
      await user.save()
    }

    const gymContext = await this.resolveGymContext(user.id)
    const tokens = await this.issueTokens(user, gymContext?.gymId)
    return { user, tokens, gymContext }
  }

  // -------------------------------------------------------------------------
  // Email + Password Flow
  // -------------------------------------------------------------------------

  async loginWithPassword(email: string, password: string): Promise<LoginResult> {
    const user = await User.findBy('email', email)

    if (!user || !(await user.verifyPassword(password))) {
      throw new Error('INVALID_CREDENTIALS')
    }

    if (!user.isActive) {
      throw new Error('ACCOUNT_DISABLED')
    }

    user.lastLoginAt = DateTime.now()
    await user.save()

    const gymContext = await this.resolveGymContext(user.id)
    const tokens = await this.issueTokens(user, gymContext?.gymId)
    return { user, tokens, gymContext }
  }

  // -------------------------------------------------------------------------
  // Token Management
  // -------------------------------------------------------------------------

  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    const key = `refresh_token:${refreshToken}`
    const stored = await redis.get(key)

    if (!stored) throw new Error('INVALID_REFRESH_TOKEN')

    const payload = JSON.parse(stored) as { userId: string; gymId?: string }
    const user = await User.findOrFail(payload.userId)

    // Rotate — invalidate old, issue new
    await redis.del(key)
    return this.issueTokens(user, payload.gymId)
  }

  async logout(refreshToken: string): Promise<void> {
    await redis.del(`refresh_token:${refreshToken}`)
  }

  async logoutAllDevices(userId: string): Promise<void> {
    const keys = await redis.keys(`refresh_token:*:${userId}`)
    if (keys.length) await redis.del(...keys)
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  private async issueTokens(user: User, gymId?: string): Promise<TokenPair> {
    const expiresIn = 15 * 60 // 15 minutes in seconds

    // Create DB-backed access token via @adonisjs/auth access_tokens provider
    const token = await User.accessTokens.create(user, ['*'], {
      expiresIn: '15m',
      name: gymId ? `gym:${gymId}` : 'default',
    })

    const refreshToken = generateRefreshToken()
    const refreshPayload = JSON.stringify({ userId: user.id, gymId: gymId ?? null })

    // 30 days TTL in Redis
    await redis.setex(`refresh_token:${refreshToken}`, 30 * 24 * 3600, refreshPayload)

    return {
      accessToken: token.value!.release(),
      refreshToken,
      expiresIn,
    }
  }

  private async resolveGymContext(
    userId: string
  ): Promise<{ gymId: string; role: string } | null> {
    const roles = await UserGymRole.query()
      .where('user_id', userId)
      .where('is_active', true)
      .limit(2)

    if (roles.length === 1) {
      return { gymId: roles[0].gymId, role: roles[0].role }
    }

    return null
  }
}
