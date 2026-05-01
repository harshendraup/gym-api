import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import db from '@adonisjs/lucid/services/db'

const createTrainerValidator = vine.compile(
  vine.object({
    userId: vine.string().uuid().optional(),
    phone: vine.string().trim().optional(),
    fullName: vine.string().trim().minLength(2).maxLength(100).optional(),
    specializations: vine.array(vine.string().trim()).optional(),
    experience: vine.number().min(0).optional(),
    bio: vine.string().trim().optional(),
    branchIds: vine.array(vine.string().uuid()).optional(),
  })
)

const updateTrainerValidator = vine.compile(
  vine.object({
    specializations: vine.array(vine.string().trim()).optional(),
    experience: vine.number().min(0).optional(),
    bio: vine.string().trim().optional(),
    branchIds: vine.array(vine.string().uuid()).optional(),
    isActive: vine.boolean().optional(),
  })
)

export default class TrainersController {
  async index({ request, response, gymId }: HttpContext) {
    const { search, branchId, page = 1, limit = 20 } = request.qs()

    let query = db
      .from('user_gym_roles as ugr')
      .join('users as u', 'u.id', 'ugr.user_id')
      .leftJoin('gym_members as gm', (q) => {
        q.on('gm.user_id', 'ugr.user_id').andOn('gm.gym_id', 'ugr.gym_id')
      })
      .where('ugr.gym_id', gymId)
      .where('ugr.role', 'trainer')
      .where('ugr.is_active', true)
      .select(
        'ugr.id',
        'ugr.user_id',
        'ugr.metadata',
        'ugr.created_at',
        'u.full_name',
        'u.email',
        'u.phone',
        'u.avatar_url',
        'gm.id as gym_member_id'
      )

    if (search) {
      query = query.whereILike('u.full_name', `%${search}%`)
    }

    if (branchId) {
      query = query.whereRaw(`ugr.metadata->>'branchIds' @> ?::jsonb`, [JSON.stringify([branchId])])
    }

    const trainers = await query.paginate(Number(page), Number(limit))
    return response.ok({ success: true, data: trainers })
  }

  async show({ params, response, gymId }: HttpContext) {
    const trainer = await db
      .from('user_gym_roles as ugr')
      .join('users as u', 'u.id', 'ugr.user_id')
      .where('ugr.gym_id', gymId)
      .where('ugr.role', 'trainer')
      .where('ugr.id', params.id)
      .select('ugr.*', 'u.full_name', 'u.email', 'u.phone', 'u.avatar_url')
      .first()

    if (!trainer) return response.notFound({ success: false, error: { code: 'NOT_FOUND', message: 'Trainer not found' } })

    const [memberCount, workoutPlans, dietPlans] = await Promise.all([
      db.from('gym_members').where('gym_id', gymId).where('trainer_id', trainer.user_id).count('id as count').first(),
      db.from('workout_plans').where('gym_id', gymId).where('trainer_id', trainer.user_id).where('is_active', true).count('id as count').first(),
      db.from('diet_plans').where('gym_id', gymId).where('trainer_id', trainer.user_id).where('is_active', true).count('id as count').first(),
    ])

    return response.ok({
      success: true,
      data: {
        ...trainer,
        stats: {
          memberCount: Number(memberCount?.count ?? 0),
          workoutPlans: Number(workoutPlans?.count ?? 0),
          dietPlans: Number(dietPlans?.count ?? 0),
        },
      },
    })
  }

  async invite({ request, response, gymId }: HttpContext) {
    const payload = await request.validateUsing(createTrainerValidator)

    // Find existing user or create one
    let user = payload.userId
      ? await db.from('users').where('id', payload.userId).first()
      : payload.phone
        ? await db.from('users').where('phone', payload.phone).first()
        : null

    if (!user && payload.phone && payload.fullName) {
      const [newUser] = await db.table('users').insert({
        id: crypto.randomUUID(),
        phone: payload.phone,
        full_name: payload.fullName,
        is_phone_verified: false,
        created_at: new Date(),
        updated_at: new Date(),
      }).returning('*')
      user = newUser
    }

    if (!user) return response.badRequest({ success: false, error: { code: 'USER_NOT_FOUND', message: 'Provide userId or phone+fullName to invite a trainer' } })

    // Check if already a trainer at this gym
    const existing = await db.from('user_gym_roles').where('user_id', user.id).where('gym_id', gymId).where('role', 'trainer').first()
    if (existing) {
      return response.conflict({ success: false, error: { code: 'ALREADY_TRAINER', message: 'User is already a trainer at this gym' } })
    }

    const role = await db.table('user_gym_roles').insert({
      id: crypto.randomUUID(),
      user_id: user.id,
      gym_id: gymId,
      role: 'trainer',
      is_active: true,
      metadata: JSON.stringify({
        specializations: payload.specializations ?? [],
        experience: payload.experience ?? 0,
        bio: payload.bio ?? '',
        branchIds: payload.branchIds ?? [],
      }),
      created_at: new Date(),
      updated_at: new Date(),
    }).returning('*')

    return response.created({ success: true, data: role[0] })
  }

  async update({ params, request, response, gymId }: HttpContext) {
    const payload = await request.validateUsing(updateTrainerValidator)

    const trainer = await db.from('user_gym_roles').where('gym_id', gymId).where('role', 'trainer').where('id', params.id).first()
    if (!trainer) return response.notFound({ success: false, error: { code: 'NOT_FOUND', message: 'Trainer not found' } })

    const currentMeta = trainer.metadata ?? {}
    const updates: Record<string, any> = { updated_at: new Date() }

    if (payload.isActive !== undefined) updates.is_active = payload.isActive
    if (payload.specializations !== undefined || payload.experience !== undefined || payload.bio !== undefined || payload.branchIds !== undefined) {
      updates.metadata = JSON.stringify({
        ...currentMeta,
        ...(payload.specializations !== undefined && { specializations: payload.specializations }),
        ...(payload.experience !== undefined && { experience: payload.experience }),
        ...(payload.bio !== undefined && { bio: payload.bio }),
        ...(payload.branchIds !== undefined && { branchIds: payload.branchIds }),
      })
    }

    await db.from('user_gym_roles').where('id', params.id).update(updates)
    const updated = await db.from('user_gym_roles').where('id', params.id).first()
    return response.ok({ success: true, data: updated })
  }

  async remove({ params, response, gymId }: HttpContext) {
    const trainer = await db.from('user_gym_roles').where('gym_id', gymId).where('role', 'trainer').where('id', params.id).first()
    if (!trainer) return response.notFound({ success: false, error: { code: 'NOT_FOUND', message: 'Trainer not found' } })

    await db.from('user_gym_roles').where('id', params.id).update({ is_active: false, updated_at: new Date() })
    return response.ok({ success: true, message: 'Trainer removed' })
  }

  async members({ params, request, response, gymId }: HttpContext) {
    const trainer = await db.from('user_gym_roles').where('gym_id', gymId).where('role', 'trainer').where('id', params.id).first()
    if (!trainer) return response.notFound({ success: false, error: { code: 'NOT_FOUND', message: 'Trainer not found' } })

    const { page = 1, limit = 20 } = request.qs()
    const members = await db
      .from('gym_members as gm')
      .join('users as u', 'u.id', 'gm.user_id')
      .where('gm.gym_id', gymId)
      .where('gm.trainer_id', trainer.user_id)
      .where('gm.status', 'active')
      .select('gm.id', 'gm.member_code', 'gm.status', 'u.full_name', 'u.avatar_url', 'u.phone')
      .paginate(Number(page), Number(limit))

    return response.ok({ success: true, data: members })
  }
}
