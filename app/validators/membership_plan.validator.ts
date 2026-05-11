import vine from '@vinejs/vine'

const billingCycles = ['monthly', 'quarterly', 'yearly'] as const
const visibilities = ['public', 'private'] as const
const planTypes = ['standard', 'premium', 'student', 'couple', 'corporate'] as const

export const createMembershipPlanValidator = vine.compile(
  vine.object({
    gymId: vine.string().uuid().optional(),
    name: vine.string().trim().minLength(2).maxLength(100),
    description: vine.string().trim().optional(),
    durationDays: vine.number().min(1).max(3650),
    price: vine.number().min(0),
    currency: vine.string().trim().fixedLength(3),
    billingCycle: vine.enum(billingCycles),
    enrollmentFee: vine.number().min(0).optional(),
    trialDays: vine.number().min(0).max(365).optional(),
    taxEnabled: vine.boolean().optional(),
    taxRate: vine.number().min(0).max(100).optional(),
    taxInclusive: vine.boolean().optional(),
    visibility: vine.enum(visibilities).optional(),
    discountPrice: vine.number().min(0).optional(),
    planType: vine.enum(planTypes).optional(),
    includesPt: vine.boolean().optional(),
    ptSessionsCount: vine.number().min(0).optional(),
    includesDiet: vine.boolean().optional(),
    includesLocker: vine.boolean().optional(),
    includesSupplements: vine.boolean().optional(),
    maxFreezeDays: vine.number().min(0).optional(),
    inclusions: vine.array(vine.string().trim()).optional(),
    isActive: vine.boolean().optional(),
    sortOrder: vine.number().optional(),
  })
)

export const updateMembershipPlanValidator = vine.compile(
  vine.object({
    gymId: vine.string().uuid().optional(),
    name: vine.string().trim().minLength(2).maxLength(100).optional(),
    description: vine.string().trim().optional(),
    durationDays: vine.number().min(1).max(3650).optional(),
    price: vine.number().min(0).optional(),
    currency: vine.string().trim().fixedLength(3).optional(),
    billingCycle: vine.enum(billingCycles).optional(),
    enrollmentFee: vine.number().min(0).optional(),
    trialDays: vine.number().min(0).max(365).optional(),
    taxEnabled: vine.boolean().optional(),
    taxRate: vine.number().min(0).max(100).optional(),
    taxInclusive: vine.boolean().optional(),
    visibility: vine.enum(visibilities).optional(),
    discountPrice: vine.number().min(0).optional(),
    planType: vine.enum(planTypes).optional(),
    includesPt: vine.boolean().optional(),
    ptSessionsCount: vine.number().min(0).optional(),
    includesDiet: vine.boolean().optional(),
    includesLocker: vine.boolean().optional(),
    includesSupplements: vine.boolean().optional(),
    maxFreezeDays: vine.number().min(0).optional(),
    inclusions: vine.array(vine.string().trim()).optional(),
    isActive: vine.boolean().optional(),
    sortOrder: vine.number().optional(),
  })
)
