import vine from '@vinejs/vine'

const manageableRoles = ['admin', 'manager', 'trainer', 'member'] as const

export const listBusinessUsersValidator = vine.compile(
  vine.object({
    page: vine.number().min(1).optional(),
    perPage: vine.number().min(1).max(100).optional(),
    search: vine.string().trim().minLength(2).maxLength(100).optional(),
    role: vine.enum(manageableRoles).optional(),
  })
)

export const createBusinessUserValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(2).maxLength(150),
    role: vine.enum(manageableRoles),
    email: vine.string().trim().email().normalizeEmail().optional(),
    phone: vine.string().trim().regex(/^\+?[\d\s\-]{7,20}$/).optional(),
    password: vine.string().minLength(8).optional(),
    gym_id: vine.string().uuid().optional(),
  })
)

export const updateBusinessUserValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(2).maxLength(150).optional(),
    role: vine.enum(manageableRoles).optional(),
    email: vine.string().trim().email().normalizeEmail().optional(),
    phone: vine.string().trim().regex(/^\+?[\d\s\-]{7,20}$/).optional(),
    password: vine.string().minLength(8).optional(),
    gym_id: vine.string().uuid().optional(),
    isActive: vine.boolean().optional(),
  })
)
