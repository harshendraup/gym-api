import redis from '@adonisjs/redis/services/main'
import User from '#models/user.model'
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
  gymContext: { gymId: string | null; role: string } | null
}

export class AuthService {
  private otpService = new OtpService()

  async requestOtp(phone: string): Promise<{ devOtp?: string }> {
    // const otp = generateOtp() // TODO: Enable real OTP generation and remove hardcoded OTP for development only
    const otp = "123456" // TODO: Remove this hardcoded OTP for development only
    await this.otpService.storeOtp(phone, otp)
    const devOtp = await this.otpService.sendSms(phone, otp)
    return devOtp ? { devOtp } : {}
  }

  async requestOtpForLogin(input: {
    businessId: string
    role: string
    email?: string
    phone?: string
  }): Promise<{ devOtp?: string }> {
    if (input.role !== 'member') {
      throw new Error('OTP_NOT_ALLOWED')
    }

    const user = await this.findLoginUser({
      businessId: input.businessId,
      role: input.role,
      email: input.email,
      phone: input.phone,
    })

    if (!user) throw new Error('MEMBER_NOT_FOUND')
    if (!user.isActive) throw new Error('ACCOUNT_DISABLED')

    // const otp = generateOtp() // TODO: Enable real OTP generation
    const otp = '123456' // TODO: remove hardcoded OTP
    await this.otpService.storeOtp(this.memberOtpKey(input.email, input.phone), otp)
    if (user.phone ?? input.phone) {
      const devOtp = await this.otpService.sendSms(user.phone ?? input.phone!, otp)
      return devOtp ? { devOtp } : {}
    }

    // Email-only fallback: OTP is still generated/stored and can be verified.
    return { devOtp: otp }
  }

  async verifyOtpAndLogin(phone: string, otp: string): Promise<LoginResult> {
    await this.otpService.verifyOtp(phone, otp)

    let user = await User.findBy('phone', phone)
    if (!user) {
      user = await User.create({
        phone,
        fullName: 'Member',
        isPhoneVerified: true,
        role: 'member',
      })
    } else {
      user.isPhoneVerified = true
      user.lastLoginAt = DateTime.now()
      await user.save()
    }

    const gymContext = this.resolveGymContext(user)
    const tokens = await this.issueTokens(user, gymContext?.gymId)
    return { user, tokens, gymContext }
  }

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

    const gymContext = this.resolveGymContext(user)
    const tokens = await this.issueTokens(user, gymContext?.gymId ?? undefined)
    return { user, tokens, gymContext }
  }

  async loginWithoutRole(input: { email?: string; phone?: string; password: string }): Promise<LoginResult> {
    const query = User.query()
    if (input.email) query.where('email', input.email)
    if (input.phone) query.where('phone', input.phone)
    const user = await query.first()

    if (!user || !(await user.verifyPassword(input.password))) {
      throw new Error('INVALID_CREDENTIALS')
    }

    if (!user.isActive) {
      throw new Error('ACCOUNT_DISABLED')
    }

    user.lastLoginAt = DateTime.now()
    await user.save()

    const gymContext = this.resolveGymContext(user)
    const tokens = await this.issueTokens(user, gymContext?.gymId ?? undefined)
    return { user, tokens, gymContext }
  }

  async loginWithRole(input: {
    businessId?: string
    role: string
    email?: string
    phone?: string
    password: string
  }): Promise<LoginResult> {
    const user = await this.findLoginUser({
      businessId: input.businessId,
      role: input.role,
      email: input.email,
      phone: input.phone,
    })

    if (!user || !(await user.verifyPassword(input.password))) {
      throw new Error('INVALID_CREDENTIALS')
    }

    if (!user.isActive) {
      throw new Error('ACCOUNT_DISABLED')
    }

    user.lastLoginAt = DateTime.now()
    await user.save()

    const gymContext = this.resolveGymContext(user)
    const tokens = await this.issueTokens(user, gymContext?.gymId ?? undefined)
    return { user, tokens, gymContext }
  }

  async verifyOtpAndLoginForRole(input: {
    email?: string
    phone?: string
    otp: string
  }): Promise<LoginResult> {
    const user = await this.findLoginUser({
      role: 'member',
      email: input.email,
      phone: input.phone,
    })
    if (!user) throw new Error('MEMBER_NOT_FOUND')
    if (!user.isActive) throw new Error('ACCOUNT_DISABLED')

    await this.otpService.verifyOtp(this.memberOtpKey(input.email, input.phone), input.otp)

    user.lastLoginAt = DateTime.now()
    await user.save()

    const gymContext = this.resolveGymContext(user)
    const tokens = await this.issueTokens(user, gymContext?.gymId ?? undefined)
    return { user, tokens, gymContext }
  }

  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    const key = `refresh_token:${refreshToken}`
    const stored = await redis.get(key)

    if (!stored) throw new Error('INVALID_REFRESH_TOKEN')

    const payload = JSON.parse(stored) as { userId: string; gymId?: string }
    const user = await User.findOrFail(payload.userId)

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

  private resolveGymContext(user: User): { gymId: string | null; role: string } | null {
    if (user.role === 'super_admin') {
      return { gymId: null, role: 'super_admin' }
    }

    if (user.gymId) {
      return { gymId: user.gymId, role: user.role }
    }

    return null
  }

  private memberOtpKey(email?: string, phone?: string): string {
    return `member_login:${email ?? phone ?? ''}`
  }

  private async findLoginUser(input: {
    businessId?: string
    role: string
    email?: string
    phone?: string
  }): Promise<User | null> {
    const query = User.query().where('role', input.role)
    if (input.businessId) {
      query.where('business_id', input.businessId)
    }

    if (input.email) query.where('email', input.email)
    if (input.phone) query.where('phone', input.phone)

    return query.first()
  }

  private async issueTokens(user: User, gymId?: string): Promise<TokenPair> {
    const expiresIn = 15 * 60

    const token = await User.accessTokens.create(user, ['*'], {
      expiresIn: '15m',
      name: gymId ? `gym:${gymId}` : 'default',
    })

    const refreshToken = generateRefreshToken()
    const refreshPayload = JSON.stringify({ userId: user.id, gymId: gymId ?? null })

    await redis.setex(`refresh_token:${refreshToken}`, 30 * 24 * 3600, refreshPayload)

    return {
      accessToken: token.value!.release(),
      refreshToken,
      expiresIn,
    }
  }
}
