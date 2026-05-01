import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'

export default class AdminUsersController {
  async index({ request, response }: HttpContext) {
    const { search, isVerified, page = 1, limit = 20 } = request.qs()

    let query = db
      .from('users')
      .orderBy('created_at', 'desc')
      .select('id', 'full_name', 'phone', 'email', 'is_phone_verified', 'is_email_verified', 'created_at', 'updated_at')

    if (search) {
      query = query.where((q) => {
        q.whereILike('full_name', `%${search}%`)
          .orWhereILike('phone', `%${search}%`)
          .orWhereILike('email', `%${search}%`)
      })
    }

    if (isVerified !== undefined) {
      query = query.where('is_phone_verified', isVerified === 'true')
    }

    const users = await query.paginate(Number(page), Number(limit))
    return response.ok({ success: true, data: users })
  }

  async show({ params, response }: HttpContext) {
    const user = await db
      .from('users')
      .where('id', params.id)
      .select('id', 'full_name', 'phone', 'email', 'is_phone_verified', 'is_email_verified', 'avatar_url', 'created_at', 'updated_at')
      .first()

    if (!user) return response.notFound({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } })

    const gymRoles = await db
      .from('user_gym_roles as ugr')
      .join('gyms as g', 'g.id', 'ugr.gym_id')
      .where('ugr.user_id', params.id)
      .select('ugr.role', 'ugr.is_active', 'g.id as gym_id', 'g.name as gym_name', 'g.slug as gym_slug')

    return response.ok({ success: true, data: { ...user, gymRoles } })
  }

  async suspend({ params, response }: HttpContext) {
    const user = await db.from('users').where('id', params.id).first()
    if (!user) return response.notFound({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } })

    await db.from('users').where('id', params.id).update({
      is_suspended: true,
      updated_at: new Date(),
    })

    // Revoke all sessions
    const { default: redis } = await import('@adonisjs/redis/services/main')
    await redis.del(`gymos:refresh:*:${params.id}`)

    return response.ok({ success: true, message: 'User suspended' })
  }

  async unsuspend({ params, response }: HttpContext) {
    await db.from('users').where('id', params.id).update({ is_suspended: false, updated_at: new Date() })
    return response.ok({ success: true, message: 'User unsuspended' })
  }

  async stats({ response }: HttpContext) {
    const [total, verified, today] = await Promise.all([
      db.from('users').count('id as count').first(),
      db.from('users').where('is_phone_verified', true).count('id as count').first(),
      db.from('users').whereRaw('created_at::date = CURRENT_DATE').count('id as count').first(),
    ])

    return response.ok({
      success: true,
      data: {
        totalUsers: Number(total?.count ?? 0),
        verifiedUsers: Number(verified?.count ?? 0),
        newToday: Number(today?.count ?? 0),
      },
    })
  }
}
