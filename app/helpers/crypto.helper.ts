import crypto from 'node:crypto'

export function generateOtp(length = 6): string {
  const max = Math.pow(10, length)
  const otp = crypto.randomInt(0, max)
  return String(otp).padStart(length, '0')
}

export function generateRefreshToken(): string {
  return crypto.randomBytes(48).toString('hex')
}

export function generateGymCode(): string {
  return crypto.randomBytes(4).toString('hex').toUpperCase()
}

export function generateMemberInviteToken(): string {
  return crypto.randomBytes(16).toString('base64url')
}

export function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return crypto.timingSafeEqual(bufA, bufB)
}
