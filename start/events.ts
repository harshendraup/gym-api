import emitter from '@adonisjs/core/services/emitter'
import logger from '@adonisjs/core/services/logger'
import AuditLog from '#models/audit_log.model'
import { NotificationService } from '#services/notification.service'

declare module '@adonisjs/core/types' {
  interface EventsList {
    'membership:created': { subscription: any; plan: any }
    'membership:activated': { subscription: any }
    'membership:expired': { subscriptionId: string; gymId: string }
    'membership:frozen': { subscription: any }
    'payment:captured': { order: any }
    'payment:failed': { orderId: string }
    'attendance:marked': { record: any }
    'audit:log': {
      gymId: string | null
      actorId: string | null
      actorRole: string | null
      action: string
      entityType: string | null
      entityId: string | null
      ipAddress: string
      userAgent: string | null
    }
  }
}

const notificationService = new NotificationService()

// ─── Membership Events ────────────────────────────────────────────────────────

emitter.on('membership:created', async ({ subscription, plan }) => {
  await notificationService.sendToUser({
    userId: subscription.gymMember?.userId ?? '',
    gymId: subscription.gymId,
    type: 'membership_expiry',
    title: `Membership Activated! 🎉`,
    body: `Your ${plan.name} membership is now active. Expires on ${subscription.expiresAt}.`,
    data: { subscriptionId: subscription.id, type: 'membership_created' },
  })
})

emitter.on('membership:activated', async ({ subscription }) => {
  logger.info({ subscriptionId: subscription.id }, 'Membership activated after payment')
})

emitter.on('membership:expired', async ({ subscriptionId, gymId }) => {
  logger.info({ subscriptionId, gymId }, 'Membership expired — reminder jobs will fire')
})

emitter.on('membership:frozen', async ({ subscription }) => {
  logger.info({ subscriptionId: subscription.id }, 'Membership frozen')
})

// ─── Payment Events ───────────────────────────────────────────────────────────

emitter.on('payment:captured', async ({ order }) => {
  await notificationService.sendToUser({
    userId: order.gymMember?.userId ?? '',
    gymId: order.gymId,
    type: 'payment_success',
    title: 'Payment Successful ✅',
    body: `Payment of ₹${(order.amount / 100).toLocaleString('en-IN')} received. Thank you!`,
    data: { orderId: order.id, type: 'payment_success' },
  })
})

emitter.on('payment:failed', async ({ orderId }) => {
  logger.warn({ orderId }, 'Payment failed')
})

// ─── Attendance Events ────────────────────────────────────────────────────────

emitter.on('attendance:marked', async ({ record }) => {
  logger.debug({ memberId: record.gymMemberId, date: record.checkInDate }, 'Attendance marked')
})

// ─── Audit Logging ────────────────────────────────────────────────────────────

emitter.on('audit:log', async (payload) => {
  try {
    await AuditLog.create({
      gymId: payload.gymId,
      actorId: payload.actorId,
      actorRole: payload.actorRole,
      action: payload.action,
      entityType: payload.entityType,
      entityId: payload.entityId,
      before: {},
      after: {},
      ipAddress: payload.ipAddress,
      userAgent: payload.userAgent,
    })
  } catch (error) {
    logger.error({ error }, 'Failed to write audit log')
  }
})
