import db from '@adonisjs/lucid/services/db'
import emitter from '@adonisjs/core/services/emitter'
import { DateTime } from 'luxon'
import MemberSubscription from '#models/member_subscription.model'
import GymMember from '#models/gym_member.model'
import MembershipPlan from '#models/membership_plan.model'
import type { SubscriptionStatus } from '#models/member_subscription.model'

interface CreateSubscriptionInput {
  gymId: string
  gymMemberId: string
  membershipPlanId: string
  startsAt?: DateTime
  paymentMode: MemberSubscription['paymentMode']
  amountPaid: number
  discountApplied?: number
  notes?: string
  createdBy: string
}

interface FreezeInput {
  gymId: string
  subscriptionId: string
  freezeDays: number
  reason?: string
}

export class MembershipService {
  async createSubscription(input: CreateSubscriptionInput): Promise<MemberSubscription> {
    const plan = await MembershipPlan.query()
      .where('id', input.membershipPlanId)
      .where('gym_id', input.gymId)
      .where('is_active', true)
      .firstOrFail()

    const startsAt = input.startsAt ?? DateTime.now()
    const expiresAt = startsAt.plus({ days: plan.durationDays })

    // Fetch gym grace period from settings
    const gym = await db.from('gyms').where('id', input.gymId).select('settings').first()
    const gracePeriodDays = gym?.settings?.grace_period_days ?? 3
    const graceExpiresAt = expiresAt.plus({ days: gracePeriodDays })

    // Cancel any existing active subscription before creating a renewal
    const activeSub = await MemberSubscription.query()
      .where('gym_member_id', input.gymMemberId)
      .whereIn('status', ['active', 'grace_period'])
      .first()

    return db.transaction(async (trx) => {
      if (activeSub) {
        activeSub.useTransaction(trx)
        activeSub.status = 'cancelled'
        await activeSub.save()
      }

      const subscription = await MemberSubscription.create(
        {
          gymId: input.gymId,
          gymMemberId: input.gymMemberId,
          membershipPlanId: input.membershipPlanId,
          previousSubscriptionId: activeSub?.id ?? null,
          status: input.paymentMode === 'online' ? 'pending_payment' : 'active',
          startsAt: startsAt.toSQLDate() as unknown as DateTime,
          expiresAt: expiresAt.toSQLDate() as unknown as DateTime,
          graceExpiresAt: graceExpiresAt.toSQLDate() as unknown as DateTime,
          amountPaid: input.amountPaid,
          discountApplied: input.discountApplied ?? 0,
          ptSessionsTotal: plan.ptSessionsCount,
          ptSessionsUsed: 0,
          paymentMode: input.paymentMode,
          notes: input.notes ?? null,
          createdBy: input.createdBy,
        },
        { client: trx }
      )

      // Update member status if paying offline (cash/card)
      if (input.paymentMode !== 'online') {
        await GymMember.query({ client: trx })
          .where('id', input.gymMemberId)
          .update({ status: 'active' })
      }

      emitter.emit('membership:created', { subscription, plan })

      return subscription
    })
  }

  async activateAfterPayment(subscriptionId: string, gymId: string): Promise<void> {
    return db.transaction(async (trx) => {
      const subscription = await MemberSubscription.query({ client: trx })
        .where('id', subscriptionId)
        .where('gym_id', gymId)
        .where('status', 'pending_payment')
        .lockForUpdate()
        .firstOrFail()

      subscription.status = 'active'
      await subscription.save()

      await GymMember.query({ client: trx })
        .where('id', subscription.gymMemberId)
        .update({ status: 'active' })

      emitter.emit('membership:activated', { subscription })
    })
  }

  async freezeMembership(input: FreezeInput): Promise<MemberSubscription> {
    const subscription = await MemberSubscription.query()
      .where('id', input.subscriptionId)
      .where('gym_id', input.gymId)
      .where('status', 'active')
      .firstOrFail()

    const plan = await MembershipPlan.findOrFail(subscription.membershipPlanId)

    const totalUsed = subscription.freezeDaysUsed + input.freezeDays
    if (totalUsed > plan.maxFreezeDays) {
      throw new Error(
        `Freeze limit exceeded. Plan allows ${plan.maxFreezeDays} days, used ${subscription.freezeDaysUsed}`
      )
    }

    const freezeExpiresAt = DateTime.now().plus({ days: input.freezeDays })

    subscription.status = 'frozen'
    subscription.frozenAt = DateTime.now() as unknown as DateTime
    subscription.freezeExpiresAt = freezeExpiresAt as unknown as DateTime
    subscription.freezeDaysUsed += input.freezeDays

    // Extend expiry by freeze days
    subscription.expiresAt = subscription.expiresAt
      .plus({ days: input.freezeDays }) as unknown as DateTime

    await subscription.save()

    emitter.emit('membership:frozen', { subscription })

    return subscription
  }

  async unfreezeMembership(subscriptionId: string, gymId: string): Promise<MemberSubscription> {
    const subscription = await MemberSubscription.query()
      .where('id', subscriptionId)
      .where('gym_id', gymId)
      .where('status', 'frozen')
      .firstOrFail()

    subscription.status = 'active'
    subscription.frozenAt = null
    subscription.freezeExpiresAt = null
    await subscription.save()

    return subscription
  }

  /**
   * Called by cron job daily — checks and expires memberships past grace period.
   */
  async processExpiries(gymId: string): Promise<number> {
    const now = DateTime.now().toSQLDate()!

    const expired = await MemberSubscription.query()
      .where('gym_id', gymId)
      .where('status', 'active')
      .where('expires_at', '<', now)
      .select('id', 'gym_member_id', 'grace_expires_at')

    if (!expired.length) return 0

    return db.transaction(async (trx) => {
      for (const sub of expired) {
        const newStatus: SubscriptionStatus =
          sub.graceExpiresAt && sub.graceExpiresAt > (DateTime.now() as unknown as DateTime)
            ? 'grace_period'
            : 'expired'

        await MemberSubscription.query({ client: trx })
          .where('id', sub.id)
          .update({ status: newStatus })

        if (newStatus === 'expired') {
          await GymMember.query({ client: trx })
            .where('id', sub.gymMemberId)
            .update({ status: 'expired' })

          emitter.emit('membership:expired', { subscriptionId: sub.id, gymId })
        }
      }

      return expired.length
    })
  }
}
