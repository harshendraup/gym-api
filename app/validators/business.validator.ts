import vine from '@vinejs/vine'

export const createBusinessValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(2).maxLength(150),
    business_key: vine
      .string()
      .trim()
      .maxLength(100)
      .regex(/^[a-zA-Z0-9_-]+$/)
      .optional(), // auto-generated from slug if not provided
    legalName: vine.string().trim().maxLength(255).optional(),
    registrationNumber: vine.string().trim().maxLength(100).optional(),
    type: vine.enum(['independent', 'chain', 'franchise']).optional(),
    description: vine.string().trim().optional(),
    email: vine.string().trim().email().normalizeEmail().optional(),
    phone: vine.string().trim().regex(/^[6-9]\d{9}$/).optional(),
    website: vine.string().trim().url().optional(),
    addressLine1: vine.string().trim().maxLength(255).optional(),
    addressLine2: vine.string().trim().maxLength(255).optional(),
    city: vine.string().trim().maxLength(100).optional(),
    state: vine.string().trim().maxLength(100).optional(),
    pincode: vine.string().trim().maxLength(10).optional(),
    country: vine.string().trim().maxLength(50).optional(),
    logoUrl: vine.string().trim().url().optional(),
    metadata: vine.record(vine.any()).optional(),
  })
)

export const updateBusinessValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(2).maxLength(150).optional(),
    business_key: vine
      .string()
      .trim()
      .maxLength(100)
      .regex(/^[a-zA-Z0-9_-]+$/)
      .optional(),
    legalName: vine.string().trim().maxLength(255).optional(),
    registrationNumber: vine.string().trim().maxLength(100).optional(),
    type: vine.enum(['independent', 'chain', 'franchise']).optional(),
    description: vine.string().trim().optional(),
    email: vine.string().trim().email().normalizeEmail().optional(),
    phone: vine.string().trim().regex(/^[6-9]\d{9}$/).optional(),
    website: vine.string().trim().url().optional(),
    addressLine1: vine.string().trim().maxLength(255).optional(),
    addressLine2: vine.string().trim().maxLength(255).optional(),
    city: vine.string().trim().maxLength(100).optional(),
    state: vine.string().trim().maxLength(100).optional(),
    pincode: vine.string().trim().maxLength(10).optional(),
    country: vine.string().trim().maxLength(50).optional(),
    logoUrl: vine.string().trim().url().optional(),
    metadata: vine.record(vine.any()).optional(),
  })
)

export const updateBusinessStatusValidator = vine.compile(
  vine.object({
    status: vine.enum(['active', 'suspended', 'pending']),
    reason: vine.string().trim().optional(),
  })
)
