import type { HttpContext } from '@adonisjs/core/http'
import Business from '#models/business.model'
import User from '#models/user.model'
import db from '@adonisjs/lucid/services/db'

export default class BusinessProfileController {
  private async buildOverview(businessId: string) {
    const business = await Business.query()
      .where('id', businessId)
      .whereNull('deleted_at')
      .firstOrFail()

    const users = await User.query().where('business_id', business.id).orderBy('created_at', 'desc')
    const gyms = await db
      .from('gyms as g')
      .join('users as u', 'g.owner_id', 'u.id')
      .where('u.business_id', business.id)
      .whereNull('g.deleted_at')
      .select(
        'g.id',
        'g.owner_id as ownerId',
        'g.name',
        'g.slug',
        'g.gym_code as gymCode',
        'g.city',
        'g.state',
        'g.status',
        'g.is_verified as isVerified',
        'g.created_at as createdAt'
      )

    const gymIds = gyms.map((g: any) => g.id)
    const memberRows = gymIds.length
      ? await db
          .from('gym_members')
          .whereIn('gym_id', gymIds)
          .whereNull('deleted_at')
          .select('status')
      : []

    const roleCounts: Record<string, { total: number; active: number; inactive: number }> = {}
    const roleGroups: Record<string, ReturnType<User['serialize']>[]> = {}

    for (const user of users) {
      if (!roleCounts[user.role]) {
        roleCounts[user.role] = { total: 0, active: 0, inactive: 0 }
      }
      if (!roleGroups[user.role]) {
        roleGroups[user.role] = []
      }
      const bucket = roleCounts[user.role]
      bucket.total += 1
      if (user.isActive) bucket.active += 1
      else bucket.inactive += 1
      roleGroups[user.role].push(user.serialize())
    }

    const memberStatusCounts: Record<string, number> = {}
    for (const row of memberRows as Array<{ status: string }>) {
      memberStatusCounts[row.status] = (memberStatusCounts[row.status] ?? 0) + 1
    }

    return {
      business: business.serialize(),
      summary: {
        totalUsers: users.length,
        totalGyms: gyms.length,
        totalGymMembers: memberRows.length,
        roleCounts,
        memberStatusCounts,
      },
      linkedUsers: {
        byRole: roleGroups,
        admins: roleGroups.admin ?? [],
        managers: roleGroups.manager ?? [],
        trainers: roleGroups.trainer ?? [],
        members: roleGroups.member ?? [],
      },
      gyms,
    }
  }

  async showById({ params, auth, response }: HttpContext) {
    const actor = auth.getUserOrFail()

    if (!actor.businessId) {
      return response.forbidden({
        success: false,
        error: { code: 'BUSINESS_SCOPE_REQUIRED', message: 'User is not mapped to any business' },
      })
    }

    if (params.id !== actor.businessId) {
      return response.forbidden({
        success: false,
        error: {
          code: 'BUSINESS_ACCESS_DENIED',
          message: 'You can only access your own business details',
        },
      })
    }

    const business = await Business.query().where('id', params.id).whereNull('deleted_at').firstOrFail()

    return response.ok({ success: true, data: business.serialize() })
  }

  async overviewById({ params, auth, response }: HttpContext) {
    const actor = auth.getUserOrFail()

    if (!actor.businessId) {
      return response.forbidden({
        success: false,
        error: { code: 'BUSINESS_SCOPE_REQUIRED', message: 'User is not mapped to any business' },
      })
    }

    if (params.id !== actor.businessId) {
      return response.forbidden({
        success: false,
        error: {
          code: 'BUSINESS_ACCESS_DENIED',
          message: 'You can only access your own business details',
        },
      })
    }

    const data = await this.buildOverview(params.id)
    return response.ok({ success: true, data })
  }

  async myOverview({ auth, response }: HttpContext) {
    const actor = auth.getUserOrFail()

    if (!actor.businessId) {
      return response.forbidden({
        success: false,
        error: { code: 'BUSINESS_SCOPE_REQUIRED', message: 'User is not mapped to any business' },
      })
    }

    const data = await this.buildOverview(actor.businessId)
    return response.ok({ success: true, data })
  }
}
