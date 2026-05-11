import type { HttpContext } from '@adonisjs/core/http'
import MembershipPlan from '#models/membership_plan.model'
import { createMembershipPlanValidator, updateMembershipPlanValidator } from '#validators/membership_plan.validator'

export default class BusinessMembershipsController {
  private async ensureBusinessAccess(ctx: HttpContext): Promise<{ businessId: string }> {
    const actor = ctx.auth.getUserOrFail()
    const businessId = ctx.params.businessId as string

    if (!actor.businessId) {
      ctx.response.forbidden({
        success: false,
        error: { code: 'BUSINESS_SCOPE_REQUIRED', message: 'User is not mapped to any business' },
      })
      throw new Error('BUSINESS_SCOPE_REQUIRED')
    }

    if (actor.businessId !== businessId) {
      ctx.response.forbidden({
        success: false,
        error: { code: 'BUSINESS_ACCESS_DENIED', message: 'You can only access your own business resources' },
      })
      throw new Error('BUSINESS_ACCESS_DENIED')
    }

    return { businessId }
  }

  async listPlans(ctx: HttpContext) {
    const { businessId } = await this.ensureBusinessAccess(ctx)

    const plans = await MembershipPlan.query()
      .where('business_id', businessId)
      .whereNull('deleted_at')
      .orderBy('created_at', 'desc')

    return ctx.response.ok({ success: true, data: plans.map((p) => p.serialize()) })
  }

  async showPlan(ctx: HttpContext) {
    const { businessId } = await this.ensureBusinessAccess(ctx)
    const plan = await MembershipPlan.query()
      .where('id', ctx.params.id)
      .where('business_id', businessId)
      .whereNull('deleted_at')
      .firstOrFail()

    return ctx.response.ok({ success: true, data: plan.serialize() })
  }

  async createPlan(ctx: HttpContext) {
    const { businessId } = await this.ensureBusinessAccess(ctx)

    const payload = await ctx.request.validateUsing(createMembershipPlanValidator)

    const plan = await MembershipPlan.create({ businessId, gymId: null, ...payload })
    return ctx.response.created({ success: true, data: plan.serialize() })
  }

  async updatePlan(ctx: HttpContext) {
    const { businessId } = await this.ensureBusinessAccess(ctx)
    const plan = await MembershipPlan.query()
      .where('id', ctx.params.id)
      .where('business_id', businessId)
      .whereNull('deleted_at')
      .firstOrFail()

    const payload = await ctx.request.validateUsing(updateMembershipPlanValidator)
    plan.merge(payload)
    await plan.save()
    return ctx.response.ok({ success: true, data: plan.serialize() })
  }

  async deletePlan(ctx: HttpContext) {
    const { businessId } = await this.ensureBusinessAccess(ctx)
    const plan = await MembershipPlan.query()
      .where('id', ctx.params.id)
      .where('business_id', businessId)
      .whereNull('deleted_at')
      .firstOrFail()

    plan.deletedAt = new Date() as any
    await plan.save()
    return ctx.response.ok({ success: true, data: { message: 'Plan deleted' } })
  }
}
