import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import db from '@adonisjs/lucid/services/db'
import hash from '@adonisjs/core/services/hash'

const inviteTrainerValidator = vine.compile(
  vine.object({
    fullName: vine.string().trim().minLength(2).maxLength(100),
    email: vine.string().trim().email().normalizeEmail(),
    phone: vine.string().trim().optional(),
    password: vine.string().minLength(6),
    specializations: vine.array(vine.string().trim()).optional(),
    experience: vine.number().min(0).optional(),
    bio: vine.string().trim().optional(),
  })
)

const updateTrainerValidator = vine.compile(
  vine.object({
    fullName: vine.string().trim().minLength(2).maxLength(100).optional(),
    specializations: vine.array(vine.string().trim()).optional(),
    experience: vine.number().min(0).optional(),
    bio: vine.string().trim().optional(),
    isActive: vine.boolean().optional(),
  })
)

export default class TrainersController {
  async index({ request, response, gymId }: HttpContext) {
    const { search, page = 1, limit = 20 } = request.qs()

    let query = db
      .from('users')
      .where('role', 'trainer')
      .where('gym_id', gymId)
      .where('is_active', true)
      .select('id', 'full_name', 'email', 'phone', 'profile_photo_url', 'metadata', 'created_at')

    if (search) query = query.whereILike('full_name', `%${search}%`)

    const trainers = await query.paginate(Number(page), Number(limit))
    return response.ok({ success: true, data: trainers })
  }

  async show({ params, response, gymId }: HttpContext) {
    const trainer = await db
      .from('users')
      .where('id', params.id)
      .where('role', 'trainer')
      .where('gym_id', gymId)
      .select('id', 'full_name', 'email', 'phone', 'profile_photo_url', 'metadata', 'is_active', 'created_at')
      .first()

    if (!trainer) return response.notFound({ success: false, error: { code: 'NOT_FOUND', message: 'Trainer not found' } })

    const [memberCount, workoutPlans, dietPlans] = await Promise.all([
      db.from('gym_members').where('gym_id', gymId).where('assigned_trainer_id', trainer.id).count('id as count').first(),
      db.from('workout_plans').where('gym_id', gymId).where('trainer_id', trainer.id).where('is_active', true).count('id as count').first(),
      db.from('diet_plans').where('gym_id', gymId).where('trainer_id', trainer.id).where('is_active', true).count('id as count').first(),
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
    const payload = await request.validateUsing(inviteTrainerValidator)

    const existing = await db.from('users').where('email', payload.email).first()
    if (existing) {
      return response.conflict({ success: false, error: { code: 'EMAIL_EXISTS', message: 'A user with this email already exists' } })
    }

    const [trainer] = await db.table('users').insert({
      id: crypto.randomUUID(),
      full_name: payload.fullName,
      email: payload.email,
      phone: payload.phone ?? null,
      password_hash: await hash.make(payload.password),
      role: 'trainer',
      gym_id: gymId,
      is_email_verified: true,
      is_active: true,
      metadata: JSON.stringify({
        specializations: payload.specializations ?? [],
        experience: payload.experience ?? 0,
        bio: payload.bio ?? '',
      }),
      created_at: new Date(),
      updated_at: new Date(),
    }).returning('id', 'full_name', 'email', 'phone', 'role', 'gym_id', 'metadata', 'created_at')

    return response.created({ success: true, data: trainer })
  }

  async update({ params, request, response, gymId }: HttpContext) {
    const trainer = await db.from('users').where('id', params.id).where('role', 'trainer').where('gym_id', gymId).first()
    if (!trainer) return response.notFound({ success: false, error: { code: 'NOT_FOUND', message: 'Trainer not found' } })

    const payload = await request.validateUsing(updateTrainerValidator)
    const updates: Record<string, any> = { updated_at: new Date() }

    if (payload.fullName !== undefined) updates.full_name = payload.fullName
    if (payload.isActive !== undefined) updates.is_active = payload.isActive

    if (payload.specializations !== undefined || payload.experience !== undefined || payload.bio !== undefined) {
      const currentMeta = trainer.metadata ?? {}
      updates.metadata = JSON.stringify({
        ...currentMeta,
        ...(payload.specializations !== undefined && { specializations: payload.specializations }),
        ...(payload.experience !== undefined && { experience: payload.experience }),
        ...(payload.bio !== undefined && { bio: payload.bio }),
      })
    }

    await db.from('users').where('id', params.id).update(updates)
    const updated = await db.from('users').where('id', params.id).first()
    return response.ok({ success: true, data: updated })
  }

  async remove({ params, response, gymId }: HttpContext) {
    const trainer = await db.from('users').where('id', params.id).where('role', 'trainer').where('gym_id', gymId).first()
    if (!trainer) return response.notFound({ success: false, error: { code: 'NOT_FOUND', message: 'Trainer not found' } })

    await db.from('users').where('id', params.id).update({ is_active: false, updated_at: new Date() })
    return response.ok({ success: true, message: 'Trainer removed' })
  }

  async members({ params, request, response, gymId }: HttpContext) {
    const trainer = await db.from('users').where('id', params.id).where('role', 'trainer').where('gym_id', gymId).first()
    if (!trainer) return response.notFound({ success: false, error: { code: 'NOT_FOUND', message: 'Trainer not found' } })

    const { page = 1, limit = 20 } = request.qs()
    const members = await db
      .from('gym_members as gm')
      .join('users as u', 'u.id', 'gm.user_id')
      .where('gm.gym_id', gymId)
      .where('gm.assigned_trainer_id', trainer.id)
      .where('gm.status', 'active')
      .select('gm.id', 'gm.member_code', 'gm.status', 'u.full_name', 'u.profile_photo_url', 'u.phone')
      .paginate(Number(page), Number(limit))

    return response.ok({ success: true, data: members })
  }
}
