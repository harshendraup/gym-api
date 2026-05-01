import vine from '@vinejs/vine'

export const requestOtpValidator = vine.compile(
  vine.object({
    phone: vine.string().trim().regex(/^[6-9]\d{9}$/),
  })
)

export const verifyOtpValidator = vine.compile(
  vine.object({
    phone: vine.string().trim().regex(/^[6-9]\d{9}$/),
    otp: vine.string().trim().fixedLength(6).regex(/^\d{6}$/),
  })
)

export const loginValidator = vine.compile(
  vine.object({
    email: vine.string().trim().email().normalizeEmail(),
    password: vine.string().minLength(8),
  })
)

export const refreshTokenValidator = vine.compile(
  vine.object({
    refreshToken: vine.string().trim().minLength(20),
  })
)
