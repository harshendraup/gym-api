import type { HttpContext } from '@adonisjs/core/http'
import { MembershipService } from '#services/membership.service'
import MemberSubscription from '#models/member_subscription.model'
import MembershipPlan from '#models/membership_plan.model'
import { createMembershipSubscriptionValidator } from '#validators/payment.validator'
import { createMembershipPlanValidator, updateMembershipPlanValidator } from '#validators/membership_plan.validator'
import vine from '@vinejs/vine'

const freezeValidator = vine.compile(
  vine.object({
    freezeDays: vine.number().min(1).max(90),
    reason: vine.string().trim().optional(),
  })
)

const membershipService = new MembershipService()

export default class MembershipsController {
  async listPlans({ response, gymId }: HttpContext) {
    const plans = await MembershipPlan.query()
      .where('gym_id', gymId)
      .whereNull('deleted_at')
      .orderBy('sort_order', 'asc')
      .orderBy('price', 'asc')

    return response.ok({ success: true, data: plans.map((p) => p.serialize()) })
  }

  async showPlan({ params, response, gymId }: HttpContext) {
    const plan = await MembershipPlan.query()
      .where('id', params.id)
      .where('gym_id', gymId)
      .whereNull('deleted_at')
      .firstOrFail()

    return response.ok({ success: true, data: plan.serialize() })
  }

  async createPlan({ request, response, gymId }: HttpContext) {
    const payload = await request.validateUsing(createMembershipPlanValidator)
    const plan = await MembershipPlan.create({ gymId, ...payload })
    return response.created({ success: true, data: plan.serialize() })
  }

  async updatePlan({ params, request, response, gymId }: HttpContext) {
    const plan = await MembershipPlan.query()
      .where('id', params.id)
      .where('gym_id', gymId)
      .whereNull('deleted_at')
      .firstOrFail()

    const payload = await request.validateUsing(updateMembershipPlanValidator)
    plan.merge(payload)
    await plan.save()
    return response.ok({ success: true, data: plan.serialize() })
  }

  async deletePlan({ params, response, gymId }: HttpContext) {
    const plan = await MembershipPlan.query()
      .where('id', params.id)
      .where('gym_id', gymId)
      .firstOrFail()

    plan.deletedAt = new Date() as any
    await plan.save()
    return response.ok({ success: true, data: { message: 'Plan deleted' } })
  }

  async subscribe({ request, response, gymId, auth }: HttpContext) {
    const payload = await request.validateUsing(createMembershipSubscriptionValidator)

    const subscription = await membershipService.createSubscription({
      gymId,
      gymMemberId: payload.gymMemberId,
      membershipPlanId: payload.membershipPlanId,
      startsAt: payload.startsAt as any,
      paymentMode: payload.paymentMode,
      amountPaid: payload.amountPaid,
      discountApplied: payload.discountApplied,
      notes: payload.notes,
      createdBy: auth.getUserOrFail().id,
    })

    return response.created({ success: true, data: subscription.serialize() })
  }

  async freeze({ params, request, response, gymId }: HttpContext) {
    const { freezeDays, reason } = await request.validateUsing(freezeValidator)
    const subscription = await membershipService.freezeMembership({
      gymId,
      subscriptionId: params.id,
      freezeDays,
      reason,
    })
    return response.ok({ success: true, data: subscription.serialize() })
  }

  async unfreeze({ params, response, gymId }: HttpContext) {
    const subscription = await membershipService.unfreezeMembership(params.id, gymId)
    return response.ok({ success: true, data: subscription.serialize() })
  }

  async cancel({ params, response, gymId }: HttpContext) {
    const subscription = await MemberSubscription.query()
      .where('id', params.id)
      .where('gym_id', gymId)
      .whereIn('status', ['active', 'grace_period', 'frozen'])
      .firstOrFail()

    subscription.status = 'cancelled'
    await subscription.save()
    return response.ok({ success: true, data: subscription.serialize() })
  }

  async expiring({ request, response, gymId }: HttpContext) {
    const days = Number(request.qs().days ?? 7)
    const members = await membershipService['memberRepository']
      ? null
      : null

    // Use the repository directly
    const { MemberRepository } = await import('#repositories/member.repository')
    const repo = new MemberRepository(gymId)
    const expiring = await repo.getExpiringMemberships(days)

    return response.ok({ success: true, data: expiring.map((s) => s.serialize()) })
  }

  async memberHistory({ params, response, gymId }: HttpContext) {
    const subscriptions = await MemberSubscription.query()
      .where('gym_member_id', params.id)
      .where('gym_id', gymId)
      .preload('membershipPlan')
      .orderBy('created_at', 'desc')

    return response.ok({ success: true, data: subscriptions.map((s) => s.serialize()) })
  }
}
