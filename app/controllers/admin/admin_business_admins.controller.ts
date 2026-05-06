import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user.model'
import Business from '#models/business.model'
import {
  createBusinessAdminValidator,
  updateBusinessAdminValidator,
} from '#validators/business_admin.validator'

export default class AdminBusinessAdminsController {
  async index({ request, response }: HttpContext) {
    const page = Number(request.qs().page ?? 1)
    const businessId = request.qs().business_id as string | undefined
    const search = request.qs().search as string | undefined
    const role = request.qs().role as string | undefined

    const query = User.query().whereIn('role', ['admin', 'manager', 'gym_owner', 'trainer'])

    if (businessId) query.where('business_id', businessId)
    if (role) query.where('role', role)
    if (search) {
      query.where((q) => {
        q.whereILike('full_name', `%${search}%`).orWhereILike('email', `%${search}%`)
      })
    }

    const admins = await query.orderBy('created_at', 'desc').paginate(page, 20)

    return response.ok({
      success: true,
      data: admins.all().map((u) => u.serialize()),
      meta: admins.getMeta(),
    })
  }

  async show({ params, response }: HttpContext) {
    const admin = await User.query()
      .where('id', params.id)
      .whereIn('role', ['admin', 'manager', 'gym_owner', 'trainer'])
      .firstOrFail()

    return response.ok({ success: true, data: admin.serialize() })
  }

  async store({ request, response }: HttpContext) {
    const payload = await request.validateUsing(createBusinessAdminValidator)

    await Business.query().where('id', payload.business_id).whereNull('deleted_at').firstOrFail()

    const existing = await User.findBy('email', payload.email)
    if (existing) {
      return response.conflict({
        success: false,
        error: {
          code: 'EMAIL_EXISTS',
          message: `A user with email "${payload.email}" already exists.`,
        },
      })
    }

    const user = await User.create({
      businessId: payload.business_id,
      fullName: payload.name,
      email: payload.email,
      phone: payload.phone ?? null,
      passwordHash: payload.password,
      role: (payload.role as User['role']) ?? 'admin',
      isEmailVerified: true,
      isActive: true,
    })

    return response.created({ success: true, data: user.serialize() })
  }

  async update({ params, request, response }: HttpContext) {
    const user = await User.query()
      .where('id', params.id)
      .whereIn('role', ['admin', 'manager', 'gym_owner', 'trainer'])
      .firstOrFail()

    const payload = await request.validateUsing(updateBusinessAdminValidator)

    if (payload.email && payload.email !== user.email) {
      const conflict = await User.findBy('email', payload.email)
      if (conflict) {
        return response.conflict({
          success: false,
          error: {
            code: 'EMAIL_CONFLICT',
            message: `Email "${payload.email}" is already in use.`,
          },
        })
      }
    }

    if (payload.name !== undefined) user.fullName = payload.name
    if (payload.email !== undefined) user.email = payload.email
    if (payload.phone !== undefined) user.phone = payload.phone ?? null
    if (payload.role !== undefined) user.role = payload.role as User['role']
    if (payload.isActive !== undefined) user.isActive = payload.isActive
    if (payload.password !== undefined) user.passwordHash = payload.password

    await user.save()

    return response.ok({ success: true, data: user.serialize() })
  }

  async destroy({ params, response }: HttpContext) {
    const user = await User.query()
      .where('id', params.id)
      .whereIn('role', ['admin', 'manager', 'gym_owner', 'trainer'])
      .firstOrFail()

    user.isActive = false
    await user.save()

    return response.ok({ success: true, message: 'User deactivated successfully.' })
  }
}
