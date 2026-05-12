import vine from '@vinejs/vine'

export const requestOtpValidator = vine.compile(
  vine.object({
    business_id: vine.string().trim().uuid(),
    email: vine.string().trim().email().normalizeEmail().optional(),
    phone: vine.string().trim().regex(/^[6-9]\d{9}$/).optional(),
    role: vine.string().trim(),
  })
)

export const verifyOtpValidator = vine.compile(
  vine.object({
    email: vine.string().trim().email().normalizeEmail().optional(),
    phone: vine.string().trim().regex(/^[6-9]\d{9}$/).optional(),
    otp: vine.string().trim().fixedLength(6).regex(/^\d{6}$/),
  })
)

export const loginValidator = vine.compile(
  vine.object({
    business_id: vine.string().trim().uuid().optional(),
    email: vine.string().trim().email().normalizeEmail().optional(),
    phone: vine.string().trim().regex(/^[6-9]\d{9}$/).optional(),
    password: vine.string().minLength(8).optional(),
    role: vine.string().trim().optional(),
  })
)

export const refreshTokenValidator = vine.compile(
  vine.object({
    refreshToken: vine.string().trim().minLength(20),
  })
)
