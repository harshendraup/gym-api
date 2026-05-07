import vine from '@vinejs/vine'

const businessAdminRoles = ['admin', 'manager', 'gym_owner', 'trainer'] as const

export const listBusinessAdminValidator = vine.compile(
  vine.object({
    page: vine.number().min(1).optional(),
    perPage: vine.number().min(1).max(100).optional(),
    business_id: vine.string().uuid().optional(),
    search: vine.string().trim().minLength(2).maxLength(100).optional(),
    role: vine.enum(businessAdminRoles).optional(),
  })
)

export const createBusinessAdminValidator = vine.compile(
  vine.object({
    business_id: vine.string().uuid(),
    name: vine.string().trim().minLength(2).maxLength(150),
    email: vine.string().trim().email().normalizeEmail(),
    phone: vine.string().trim().regex(/^\+?[\d\s\-]{7,20}$/).optional(),
    password: vine.string().minLength(8),
    role: vine.enum(businessAdminRoles).optional(),
  })
)

export const updateBusinessAdminValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(2).maxLength(150).optional(),
    email: vine.string().trim().email().normalizeEmail().optional(),
    phone: vine.string().trim().regex(/^\+?[\d\s\-]{7,20}$/).optional(),
    password: vine.string().minLength(8).optional(),
    role: vine.enum(businessAdminRoles).optional(),
    isActive: vine.boolean().optional(),
  })
)
