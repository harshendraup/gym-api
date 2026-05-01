import redis from '@adonisjs/redis/services/main'
import env from '#start/env'
import logger from '@adonisjs/core/services/logger'

const OTP_TTL = 5 * 60          // 5 minutes
const MAX_ATTEMPTS = 5
const LOCKOUT_TTL = 15 * 60     // 15 minutes

export class OtpService {
  private otpKey(phone: string) {
    return `otp:${phone}`
  }

  private attemptsKey(phone: string) {
    return `otp_attempts:${phone}`
  }

  private lockoutKey(phone: string) {
    return `otp_lockout:${phone}`
  }

  async storeOtp(phone: string, otp: string): Promise<void> {
    await redis.setex(this.otpKey(phone), OTP_TTL, otp)
    // Reset attempt counter on new OTP
    await redis.del(this.attemptsKey(phone))
  }

  async verifyOtp(phone: string, provided: string): Promise<void> {
    const lockout = await redis.get(this.lockoutKey(phone))
    if (lockout) {
      throw new Error('OTP_LOCKED_OUT')
    }

    const stored = await redis.get(this.otpKey(phone))
    if (!stored) {
      throw new Error('OTP_EXPIRED')
    }

    const attempts = await redis.incr(this.attemptsKey(phone))
    await redis.expire(this.attemptsKey(phone), OTP_TTL)

    if (attempts > MAX_ATTEMPTS) {
      await redis.setex(this.lockoutKey(phone), LOCKOUT_TTL, '1')
      await redis.del(this.otpKey(phone))
      throw new Error('OTP_MAX_ATTEMPTS_EXCEEDED')
    }

    if (stored !== provided) {
      throw new Error('OTP_INVALID')
    }

    // Valid — clean up
    await redis.del(this.otpKey(phone))
    await redis.del(this.attemptsKey(phone))
  }

  async sendSms(phone: string, otp: string): Promise<void> {
    // MSG91 integration
    const apiKey = env.get('MSG91_API_KEY')
    const senderId = env.get('MSG91_SENDER_ID')
    const templateId = env.get('MSG91_TEMPLATE_ID')

    if (!apiKey) {
      // Dev mode — log OTP instead of sending
      logger.info(`[DEV] OTP for ${phone}: ${otp}`)
      return
    }

    try {
      const response = await fetch('https://api.msg91.com/api/v5/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', authkey: apiKey },
        body: JSON.stringify({
          template_id: templateId,
          mobile: `91${phone}`,
          authkey: apiKey,
          otp,
          sender: senderId,
        }),
      })

      if (!response.ok) {
        throw new Error(`MSG91 error: ${response.statusText}`)
      }
    } catch (error) {
      logger.error({ error, phone }, 'Failed to send OTP')
      throw new Error('OTP_SEND_FAILED')
    }
  }
}
