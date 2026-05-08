import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user.model'
import {
  createBusinessUserValidator,
  listBusinessUsersValidator,
  updateBusinessUserValidator,
} from '#validators/business_user.validator'

const MANAGEABLE_ROLES = ['admin', 'manager', 'trainer', 'member'] as const

type ManageableRole = (typeof MANAGEABLE_ROLES)[number]

export default class BusinessUsersController {
  async index({ request, response, auth }: HttpContext) {
    const actor = auth.getUserOrFail()

    if (!actor.businessId) {
      return response.forbidden({
        success: false,
        error: { code: 'BUSINESS_SCOPE_REQUIRED', message: 'User is not mapped to any business' },
      })
    }

    const payload = await request.validateUsing(listBusinessUsersValidator)
    const page = payload.page ?? 1
    const perPage = payload.perPage ?? 20

    const query = User.query()
      .where('business_id', actor.businessId)
      .whereIn('role', [...MANAGEABLE_ROLES])

    if (payload.role) query.where('role', payload.role)

    if (payload.search) {
      query.where((q) => {
        q.whereILike('full_name', `%${payload.search}%`)
          .orWhereILike('email', `%${payload.search}%`)
          .orWhereILike('phone', `%${payload.search}%`)
      })
    }

    const users = await query.orderBy('created_at', 'desc').paginate(page, perPage)

    return response.ok({
      success: true,
      data: users.all().map((u) => u.serialize()),
      meta: users.getMeta(),
    })
  }

  async store({ request, response, auth }: HttpContext) {
    const actor = auth.getUserOrFail()

    if (!actor.businessId) {
      return response.forbidden({
        success: false,
        error: { code: 'BUSINESS_SCOPE_REQUIRED', message: 'User is not mapped to any business' },
      })
    }

    const payload = await request.validateUsing(createBusinessUserValidator)

    const role = payload.role as ManageableRole
    const isMember = role === 'member'

    if (!isMember && (!payload.email || !payload.password)) {
      return response.badRequest({
        success: false,
        error: {
          code: 'EMAIL_PASSWORD_REQUIRED',
          message: 'email and password are required for admin/manager/trainer users',
        },
      })
    }

    if (isMember && !payload.phone && !payload.email) {
      return response.badRequest({
        success: false,
        error: {
          code: 'CONTACT_REQUIRED',
          message: 'member requires at least one contact field: phone or email',
        },
      })
    }

    if (payload.email) {
      const existing = await User.findBy('email', payload.email)
      if (existing) {
        return response.conflict({
          success: false,
          error: { code: 'EMAIL_EXISTS', message: `A user with email "${payload.email}" already exists.` },
        })
      }
    }

    if (payload.phone) {
      const existing = await User.findBy('phone', payload.phone)
      if (existing) {
        return response.conflict({
          success: false,
          error: { code: 'PHONE_EXISTS', message: `A user with phone "${payload.phone}" already exists.` },
        })
      }
    }

    const user = await User.create({
      businessId: actor.businessId,
      gymId: payload.gym_id ?? null,
      fullName: payload.name,
      role,
      email: payload.email ?? null,
      phone: payload.phone ?? null,
      passwordHash: payload.password ?? null,
      isEmailVerified: Boolean(payload.email),
      isPhoneVerified: Boolean(payload.phone),
      isActive: true,
    })

    return response.created({ success: true, data: user.serialize() })
  }

  async update({ params, request, response, auth }: HttpContext) {
    const actor = auth.getUserOrFail()

    if (!actor.businessId) {
      return response.forbidden({
        success: false,
        error: { code: 'BUSINESS_SCOPE_REQUIRED', message: 'User is not mapped to any business' },
      })
    }

    const user = await User.query()
      .where('id', params.id)
      .where('business_id', actor.businessId)
      .whereIn('role', [...MANAGEABLE_ROLES])
      .firstOrFail()

    const payload = await request.validateUsing(updateBusinessUserValidator)

    if (payload.email && payload.email !== user.email) {
      const conflict = await User.findBy('email', payload.email)
      if (conflict) {
        return response.conflict({
          success: false,
          error: { code: 'EMAIL_CONFLICT', message: `Email "${payload.email}" is already in use.` },
        })
      }
    }

    if (payload.phone && payload.phone !== user.phone) {
      const conflict = await User.findBy('phone', payload.phone)
      if (conflict) {
        return response.conflict({
          success: false,
          error: { code: 'PHONE_CONFLICT', message: `Phone "${payload.phone}" is already in use.` },
        })
      }
    }

    if (payload.name !== undefined) user.fullName = payload.name
    if (payload.role !== undefined) user.role = payload.role
    if (payload.email !== undefined) user.email = payload.email
    if (payload.phone !== undefined) user.phone = payload.phone
    if (payload.gym_id !== undefined) user.gymId = payload.gym_id
    if (payload.password !== undefined) user.passwordHash = payload.password
    if (payload.isActive !== undefined) user.isActive = payload.isActive

    await user.save()

    return response.ok({ success: true, data: user.serialize() })
  }

  async destroy({ params, response, auth }: HttpContext) {
    const actor = auth.getUserOrFail()

    if (!actor.businessId) {
      return response.forbidden({
        success: false,
        error: { code: 'BUSINESS_SCOPE_REQUIRED', message: 'User is not mapped to any business' },
      })
    }

    const user = await User.query()
      .where('id', params.id)
      .where('business_id', actor.businessId)
      .whereIn('role', [...MANAGEABLE_ROLES])
      .firstOrFail()

    user.isActive = false
    await user.save()

    return response.ok({ success: true, message: 'User deactivated successfully.' })
  }
}
