import vine from '@vinejs/vine'

export const createBusinessAdminValidator = vine.compile(
  vine.object({
    business_id: vine.string().uuid(),
    name: vine.string().trim().minLength(2).maxLength(150),
    email: vine.string().trim().email().normalizeEmail(),
    phone: vine.string().trim().regex(/^\+?[\d\s\-]{7,20}$/).optional(),
    password: vine.string().minLength(8),
    role: vine.enum(['admin', 'manager', 'owner']).optional(),
  })
)

export const updateBusinessAdminValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(2).maxLength(150).optional(),
    email: vine.string().trim().email().normalizeEmail().optional(),
    phone: vine.string().trim().regex(/^\+?[\d\s\-]{7,20}$/).optional(),
    password: vine.string().minLength(8).optional(),
    role: vine.enum(['admin', 'manager', 'owner']).optional(),
    isActive: vine.boolean().optional(),
  })
)
