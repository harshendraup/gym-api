/**
 * BullMQ Workers — run in a separate process from the HTTP server.
 * Start with: node ace worker:start  (or separate Docker container)
 */
import { Worker, type Job } from 'bullmq'
import redis from '@adonisjs/redis/services/main'
import logger from '@adonisjs/core/services/logger'
import { NotificationService } from '#services/notification.service'
import { MembershipService } from '#services/membership.service'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

const connection = redis.ioRedisClient
const notificationService = new NotificationService()
const membershipService = new MembershipService()

// ─── Notification Worker ───────────────────────────────────────────────────

new Worker(
  'notifications',
  async (job: Job) => {
    if (job.name === 'send-push') {
      const { userId, title, body, data } = job.data
      await notificationService.deliverPushToUser(userId, title, body, data)
    }

    if (job.name === 'broadcast') {
      const { gymId, title, body, data, targetMemberIds } = job.data

      let userIds: string[]

      if (targetMemberIds?.length) {
        userIds = await db
          .from('gym_members')
          .whereIn('id', targetMemberIds)
          .pluck('user_id')
      } else {
        userIds = await db
          .from('gym_members')
          .where('gym_id', gymId)
          .where('status', 'active')
          .pluck('user_id')
      }

      await Promise.allSettled(
        userIds.map((userId) =>
          notificationService.deliverPushToUser(userId, title, body, data ?? {})
        )
      )
    }
  },
  { connection, concurrency: 10 }
)

// ─── Scheduler Worker ─────────────────────────────────────────────────────

new Worker(
  'scheduler',
  async (job: Job) => {
    if (job.name === 'process-membership-expiries') {
      const gymIds = await db.from('gyms').where('status', 'active').pluck('id')
      let total = 0
      for (const gymId of gymIds) {
        const count = await membershipService.processExpiries(gymId)
        total += count
      }
      logger.info({ total }, 'Membership expiry job completed')
    }

    if (job.name === 'send-expiry-reminders') {
      const { daysAhead } = job.data
      const thresholdDate = DateTime.now().plus({ days: daysAhead }).toSQLDate()!

      const expiring = await db
        .from('member_subscriptions as ms')
        .join('gym_members as gm', 'gm.id', 'ms.gym_member_id')
        .join('users as u', 'u.id', 'gm.user_id')
        .join('membership_plans as mp', 'mp.id', 'ms.membership_plan_id')
        .where('ms.status', 'active')
        .where('ms.expires_at', thresholdDate)
        .select('u.id as user_id', 'ms.gym_id', 'mp.name as plan_name', 'ms.expires_at')

      await Promise.allSettled(
        expiring.map(async (sub) => {
          await notificationService.sendToUser({
            userId: sub.user_id,
            gymId: sub.gym_id,
            type: 'membership_expiry',
            title: `Membership expiring in ${daysAhead} days ⏰`,
            body: `Your ${sub.plan_name} membership expires on ${sub.expires_at}. Renew now to continue your fitness journey!`,
            data: { type: 'membership_expiry', gymId: sub.gym_id },
          })
        })
      )

      logger.info({ count: expiring.length, daysAhead }, 'Expiry reminders sent')
    }

    if (job.name === 'unfreeze-expired-memberships') {
      const now = DateTime.now().toSQLDate()!

      const toUnfreeze = await db
        .from('member_subscriptions')
        .where('status', 'frozen')
        .where('freeze_expires_at', '<=', now)
        .pluck('id')

      for (const id of toUnfreeze) {
        const sub = await (await import('#models/member_subscription.model')).default.findOrFail(id)
        await membershipService.unfreezeMembership(id, sub.gymId)
      }

      logger.info({ count: toUnfreeze.length }, 'Unfroze expired memberships')
    }

    if (job.name === 'cleanup-stale-orders') {
      const cutoff = DateTime.now().minus({ hours: 24 }).toSQL()!
      await db
        .from('payment_orders')
        .where('status', 'created')
        .where('created_at', '<', cutoff)
        .update({ status: 'failed' })
    }
  },
  { connection, concurrency: 3 }
)

logger.info('Workers started and listening for jobs')
