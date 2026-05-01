import vine from '@vinejs/vine'

export const createOrderValidator = vine.compile(
  vine.object({
    gymMemberId: vine.string().uuid(),
    subscriptionId: vine.string().uuid(),
    amount: vine.number().min(100),           // minimum 1 INR (100 paise)
    description: vine.string().trim().maxLength(255).optional(),
  })
)

export const verifyPaymentValidator = vine.compile(
  vine.object({
    razorpayOrderId: vine.string().trim().startsWith('order_'),
    razorpayPaymentId: vine.string().trim().startsWith('pay_'),
    razorpaySignature: vine.string().trim().minLength(64),
  })
)

export const offlinePaymentValidator = vine.compile(
  vine.object({
    gymMemberId: vine.string().uuid(),
    subscriptionId: vine.string().uuid(),
    amount: vine.number().min(100),
    method: vine.enum(['cash', 'upi', 'card', 'cheque']),
    referenceNumber: vine.string().trim().maxLength(50).optional(),
  })
)

export const createMembershipSubscriptionValidator = vine.compile(
  vine.object({
    membershipPlanId: vine.string().uuid(),
    gymMemberId: vine.string().uuid(),
    startsAt: vine.date({ formats: ['YYYY-MM-DD'] }).optional(),
    paymentMode: vine.enum(['online', 'cash', 'upi', 'card', 'cheque', 'partial']),
    amountPaid: vine.number().min(0),
    discountApplied: vine.number().min(0).optional(),
    notes: vine.string().trim().maxLength(500).optional(),
  })
)
