import type { HttpContext } from '@adonisjs/core/http'
import { MemberRepository } from '#repositories/member.repository'
import { MemberService } from '#services/member.service'
import {
  createMemberValidator,
  updateMemberValidator,
  listMembersValidator,
} from '#validators/member.validator'

export default class MembersController {
  /**
   * GET /api/v1/gyms/:gymId/members
   */
  async index({ request, response, gymId }: HttpContext) {
    const filters = await request.validateUsing(listMembersValidator)
    const repo = new MemberRepository(gymId)

    const members = await repo.listWithFilters({
      ...filters,
      page: filters.page ?? 1,
      perPage: filters.perPage ?? 20,
    })

    return response.ok({
      success: true,
      data: members.all().map((m) => m.serialize()),
      meta: members.getMeta(),
    })
  }

  /**
   * GET /api/v1/gyms/:gymId/members/:id
   */
  async show({ params, response, gymId }: HttpContext) {
    const repo = new MemberRepository(gymId)
    const member = await repo.findWithActiveSubscription(params.id)

    return response.ok({ success: true, data: member.serialize() })
  }

  /**
   * POST /api/v1/gyms/:gymId/members
   */
  async store({ request, response, gymId, auth }: HttpContext) {
    const payload = await request.validateUsing(createMemberValidator)
    const service = new MemberService()

    const member = await service.createMember({
      gymId,
      createdBy: auth.getUserOrFail().id,
      ...payload,
    })

    return response.created({ success: true, data: member.serialize() })
  }

  /**
   * PUT /api/v1/gyms/:gymId/members/:id
   */
  async update({ params, request, response, gymId }: HttpContext) {
    const payload = await request.validateUsing(updateMemberValidator)
    const service = new MemberService()

    const member = await service.updateMember(params.id, gymId, payload)
    return response.ok({ success: true, data: member.serialize() })
  }

  /**
   * DELETE /api/v1/gyms/:gymId/members/:id
   */
  async destroy({ params, response, gymId, auth }: HttpContext) {
    const service = new MemberService()
    await service.deleteMember(params.id, gymId, auth.getUserOrFail().id)
    return response.ok({ success: true, data: { message: 'Member removed successfully' } })
  }

  /**
   * GET /api/v1/gyms/:gymId/members/:id/stats
   */
  async stats({ params, response, gymId }: HttpContext) {
    const service = new MemberService()
    const stats = await service.getMemberStats(params.id, gymId)
    return response.ok({ success: true, data: stats })
  }
}
