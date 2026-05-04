import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import hash from '@adonisjs/core/services/hash'
import vine from '@vinejs/vine'

const createGymOwnerValidator = vine.compile(
  vine.object({
    fullName: vine.string().trim().minLength(2).maxLength(100),
    email: vine.string().email().trim(),
    password: vine.string().minLength(6),
    gymId: vine.string().uuid(),
  })
)

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

  async listGymOwners({ request, response }: HttpContext) {
    const { gymId, search, page = 1, limit = 20 } = request.qs()

    let query = db
      .from('user_gym_roles as ugr')
      .join('users as u', 'u.id', 'ugr.user_id')
      .join('gyms as g', 'g.id', 'ugr.gym_id')
      .where('ugr.role', 'gym_owner')
      .select('ugr.id', 'ugr.gym_id', 'ugr.is_active', 'ugr.created_at', 'u.id as user_id', 'u.full_name', 'u.email', 'g.name as gym_name')
      .orderBy('ugr.created_at', 'desc')

    if (gymId) query = query.where('ugr.gym_id', gymId)
    if (search) {
      query = query.where((q) => {
        q.whereILike('u.full_name', `%${search}%`).orWhereILike('u.email', `%${search}%`)
      })
    }

    const owners = await query.paginate(Number(page), Number(limit))
    return response.ok({ success: true, data: owners })
  }

  async createGymOwner({ request, response }: HttpContext) {
    const payload = await request.validateUsing(createGymOwnerValidator)

    const existing = await db.from('users').where('email', payload.email).first()
    if (existing) {
      return response.conflict({ success: false, error: { code: 'EMAIL_EXISTS', message: 'Email already in use' } })
    }

    const gym = await db.from('gyms').where('id', payload.gymId).first()
    if (!gym) return response.notFound({ success: false, error: { code: 'GYM_NOT_FOUND', message: 'Gym not found' } })

    const [user] = await db.table('users').insert({
      id: crypto.randomUUID(),
      full_name: payload.fullName,
      email: payload.email,
      password_hash: await hash.make(payload.password),
      is_email_verified: true,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    }).returning('id', 'full_name', 'email', 'created_at')

    await db.table('user_gym_roles').insert({
      id: crypto.randomUUID(),
      user_id: user.id,
      gym_id: payload.gymId,
      role: 'gym_owner',
      is_active: true,
      permissions: JSON.stringify([]),
      created_at: new Date(),
      updated_at: new Date(),
    })

    return response.created({ success: true, data: { user, gymId: payload.gymId, gymName: gym.name } })
  }

  async removeGymOwner({ params, response }: HttpContext) {
    const role = await db.from('user_gym_roles').where('id', params.id).where('role', 'gym_owner').first()
    if (!role) return response.notFound({ success: false, error: { code: 'NOT_FOUND', message: 'Gym owner not found' } })

    await db.from('user_gym_roles').where('id', params.id).update({ is_active: false, updated_at: new Date() })
    return response.ok({ success: true, message: 'Gym owner removed' })
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
