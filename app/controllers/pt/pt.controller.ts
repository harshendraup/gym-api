import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

const createPackageValidator = vine.compile(
  vine.object({
    trainerId: vine.string().uuid(),
    name: vine.string().trim().minLength(2).maxLength(100),
    description: vine.string().trim().optional(),
    totalSessions: vine.number().positive(),
    validityDays: vine.number().positive(),
    price: vine.number().min(0),
    sessionDurationMinutes: vine.number().positive().optional(),
  })
)

const bookSessionValidator = vine.compile(
  vine.object({
    gymMemberId: vine.string().uuid(),
    ptPackageId: vine.string().uuid(),
    trainerId: vine.string().uuid(),
    scheduledAt: vine.date({ formats: ['YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DDTHH:mm:ss'] }),
    notes: vine.string().trim().optional(),
  })
)

const updateBookingValidator = vine.compile(
  vine.object({
    status: vine.enum(['confirmed', 'completed', 'cancelled', 'no_show']),
    notes: vine.string().trim().optional(),
    trainerNotes: vine.string().trim().optional(),
  })
)

export default class PtController {
  // ─── PT Packages ───────────────────────────────────────────────────────────

  async listPackages({ request, response, gymId }: HttpContext) {
    const { trainerId, isActive } = request.qs()

    let query = db
      .from('pt_packages as pp')
      .join('user_gym_roles as ugr', 'ugr.user_id', 'pp.trainer_id')
      .join('users as u', 'u.id', 'pp.trainer_id')
      .where('pp.gym_id', gymId)
      .where('ugr.gym_id', gymId)
      .where('ugr.role', 'trainer')
      .select('pp.*', 'u.full_name as trainer_name', 'u.avatar_url as trainer_avatar')

    if (trainerId) query = query.where('pp.trainer_id', trainerId)
    if (isActive !== undefined) query = query.where('pp.is_active', isActive === 'true')

    const packages = await query.orderBy('pp.created_at', 'desc')
    return response.ok({ success: true, data: packages })
  }

  async createPackage({ request, response, gymId }: HttpContext) {
    const payload = await request.validateUsing(createPackageValidator)

    const trainer = await db.from('user_gym_roles').where('gym_id', gymId).where('user_id', payload.trainerId).where('role', 'trainer').where('is_active', true).first()
    if (!trainer) return response.notFound({ success: false, error: { code: 'NOT_FOUND', message: 'Trainer not found' } })

    const pkg = await db.table('pt_packages').insert({
      id: crypto.randomUUID(),
      gym_id: gymId,
      trainer_id: payload.trainerId,
      name: payload.name,
      description: payload.description,
      total_sessions: payload.totalSessions,
      validity_days: payload.validityDays,
      price: payload.price,
      session_duration_minutes: payload.sessionDurationMinutes ?? 60,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    }).returning('*')

    return response.created({ success: true, data: pkg[0] })
  }

  async updatePackage({ params, request, response, gymId }: HttpContext) {
    const pkg = await db.from('pt_packages').where('gym_id', gymId).where('id', params.id).first()
    if (!pkg) return response.notFound({ success: false, error: { code: 'NOT_FOUND', message: 'Package not found' } })

    const body = request.only(['name', 'description', 'totalSessions', 'validityDays', 'price', 'sessionDurationMinutes', 'isActive'])

    await db.from('pt_packages').where('id', params.id).update({
      name: body.name ?? pkg.name,
      description: body.description ?? pkg.description,
      total_sessions: body.totalSessions ?? pkg.total_sessions,
      validity_days: body.validityDays ?? pkg.validity_days,
      price: body.price ?? pkg.price,
      session_duration_minutes: body.sessionDurationMinutes ?? pkg.session_duration_minutes,
      is_active: body.isActive ?? pkg.is_active,
      updated_at: new Date(),
    })

    const updated = await db.from('pt_packages').where('id', params.id).first()
    return response.ok({ success: true, data: updated })
  }

  // ─── PT Bookings ────────────────────────────────────────────────────────────

  async listBookings({ request, response, gymId, auth }: HttpContext) {
    const { trainerId, gymMemberId, status, date, page = 1, limit = 20 } = request.qs()
    const userId = auth.getUserOrFail().id

    // Trainers see only their own bookings unless staff/owner
    const userRole = await db.from('user_gym_roles').where('user_id', userId).where('gym_id', gymId).whereIn('role', ['gym_owner', 'staff', 'super_admin']).first()
    const isTrainer = await db.from('user_gym_roles').where('user_id', userId).where('gym_id', gymId).where('role', 'trainer').first()

    let query = db
      .from('pt_bookings as pb')
      .join('users as tu', 'tu.id', 'pb.trainer_id')
      .join('gym_members as gm', 'gm.id', 'pb.gym_member_id')
      .join('users as mu', 'mu.id', 'gm.user_id')
      .join('pt_packages as pp', 'pp.id', 'pb.pt_package_id')
      .where('pb.gym_id', gymId)
      .select(
        'pb.*',
        'tu.full_name as trainer_name',
        'mu.full_name as member_name',
        'mu.avatar_url as member_avatar',
        'pp.name as package_name',
        'pp.session_duration_minutes'
      )
      .orderBy('pb.scheduled_at', 'asc')

    if (!userRole && isTrainer) query = query.where('pb.trainer_id', userId)
    if (trainerId) query = query.where('pb.trainer_id', trainerId)
    if (gymMemberId) query = query.where('pb.gym_member_id', gymMemberId)
    if (status) query = query.where('pb.status', status)
    if (date) query = query.whereRaw('pb.scheduled_at::date = ?', [date])

    const bookings = await query.paginate(Number(page), Number(limit))
    return response.ok({ success: true, data: bookings })
  }

  async bookSession({ request, response, gymId }: HttpContext) {
    const payload = await request.validateUsing(bookSessionValidator)

    const member = await db.from('gym_members').where('gym_id', gymId).where('id', payload.gymMemberId).first()
    if (!member) return response.notFound({ success: false, error: { code: 'NOT_FOUND', message: 'Member not found' } })

    const pkg = await db.from('pt_packages').where('gym_id', gymId).where('id', payload.ptPackageId).where('is_active', true).first()
    if (!pkg) return response.notFound({ success: false, error: { code: 'NOT_FOUND', message: 'PT package not found' } })

    // Check session availability on member's subscription (if PT included in plan)
    const activeSub = await db
      .from('member_subscriptions')
      .where('gym_member_id', payload.gymMemberId)
      .whereIn('status', ['active', 'grace_period'])
      .orderBy('created_at', 'desc')
      .first()

    const usedSessions = await db
      .from('pt_bookings')
      .where('gym_member_id', payload.gymMemberId)
      .where('pt_package_id', payload.ptPackageId)
      .whereIn('status', ['confirmed', 'completed'])
      .count('id as count')
      .first()

    const used = Number(usedSessions?.count ?? 0)
    if (used >= pkg.total_sessions) {
      return response.forbidden({ success: false, error: { code: 'NO_SESSIONS_LEFT', message: 'No PT sessions remaining in this package' } })
    }

    // Check trainer slot availability (no overlap)
    const scheduledAt = DateTime.fromJSDate(new Date(payload.scheduledAt))
    const endAt = scheduledAt.plus({ minutes: pkg.session_duration_minutes })

    const conflict = await db
      .from('pt_bookings')
      .where('trainer_id', payload.trainerId)
      .where('gym_id', gymId)
      .whereIn('status', ['confirmed'])
      .whereRaw(
        `(scheduled_at, scheduled_at + (? * interval '1 minute')) OVERLAPS (?, ?)`,
        [pkg.session_duration_minutes, scheduledAt.toSQL(), endAt.toSQL()]
      )
      .first()

    if (conflict) {
      return response.conflict({ success: false, error: { code: 'SLOT_UNAVAILABLE', message: 'Trainer is not available at this time' } })
    }

    const booking = await db.table('pt_bookings').insert({
      id: crypto.randomUUID(),
      gym_id: gymId,
      gym_member_id: payload.gymMemberId,
      trainer_id: payload.trainerId,
      pt_package_id: payload.ptPackageId,
      member_subscription_id: activeSub?.id ?? null,
      scheduled_at: scheduledAt.toSQL(),
      duration_minutes: pkg.session_duration_minutes,
      status: 'confirmed',
      notes: payload.notes,
      created_at: new Date(),
      updated_at: new Date(),
    }).returning('*')

    return response.created({ success: true, data: booking[0] })
  }

  async updateBooking({ params, request, response, gymId }: HttpContext) {
    const payload = await request.validateUsing(updateBookingValidator)

    const booking = await db.from('pt_bookings').where('gym_id', gymId).where('id', params.id).first()
    if (!booking) return response.notFound({ success: false, error: { code: 'NOT_FOUND', message: 'Booking not found' } })

    await db.from('pt_bookings').where('id', params.id).update({
      status: payload.status,
      notes: payload.notes ?? booking.notes,
      trainer_notes: payload.trainerNotes ?? booking.trainer_notes,
      ...(payload.status === 'completed' && { completed_at: new Date() }),
      updated_at: new Date(),
    })

    const updated = await db.from('pt_bookings').where('id', params.id).first()
    return response.ok({ success: true, data: updated })
  }

  async trainerSchedule({ params, request, response, gymId }: HttpContext) {
    const { date } = request.qs()
    if (!date) return response.badRequest({ success: false, error: { code: 'MISSING_DATE', message: 'date query param required (YYYY-MM-DD)' } })

    const bookings = await db
      .from('pt_bookings as pb')
      .join('gym_members as gm', 'gm.id', 'pb.gym_member_id')
      .join('users as mu', 'mu.id', 'gm.user_id')
      .where('pb.gym_id', gymId)
      .where('pb.trainer_id', params.trainerId)
      .whereRaw('pb.scheduled_at::date = ?', [date])
      .whereIn('pb.status', ['confirmed', 'completed'])
      .select('pb.*', 'mu.full_name as member_name', 'mu.avatar_url as member_avatar')
      .orderBy('pb.scheduled_at', 'asc')

    return response.ok({ success: true, data: bookings })
  }
}
