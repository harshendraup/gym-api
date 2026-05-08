import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user.model'
import Business from '#models/business.model'
import {
  createBusinessAdminValidator,
  listBusinessAdminValidator,
  updateBusinessAdminValidator,
} from '#validators/business_admin.validator'

export default class AdminBusinessAdminsController {
  private resolveBusinessScope(actor: User, requestedBusinessId?: string) {
    if (actor.role === 'super_admin') return requestedBusinessId
    return actor.businessId ?? requestedBusinessId
  }

  async index({ request, response, auth }: HttpContext) {
    const actor = auth.getUserOrFail()
    const payload = await request.validateUsing(listBusinessAdminValidator)
    const page = payload.page ?? 1
    const perPage = payload.perPage ?? 20

    const query = User.query()

    const businessScope = this.resolveBusinessScope(actor, payload.business_id)
    if (businessScope) query.where('business_id', businessScope)
    if (payload.role) query.where('role', payload.role)
    if (payload.search) {
      query.where((q) => {
        q.whereILike('full_name', `%${payload.search}%`).orWhereILike('email', `%${payload.search}%`)
      })
    }

    const admins = await query.orderBy('created_at', 'desc').paginate(page, perPage)

    return response.ok({
      success: true,
      data: admins.all().map((u) => u.serialize()),
      meta: admins.getMeta(),
    })
  }

  async show({ params, response, auth }: HttpContext) {
    const actor = auth.getUserOrFail()
    const query = User.query().where('id', params.id)
    if (actor.role !== 'super_admin') {
      if (!actor.businessId) {
        return response.forbidden({
          success: false,
          error: { code: 'BUSINESS_SCOPE_REQUIRED', message: 'User is not mapped to any business' },
        })
      }
      query.where('business_id', actor.businessId)
    }
    const admin = await query.firstOrFail()

    return response.ok({ success: true, data: admin.serialize() })
  }

  async store({ request, response, auth }: HttpContext) {
    const actor = auth.getUserOrFail()
    const payload = await request.validateUsing(createBusinessAdminValidator)
    const businessId = this.resolveBusinessScope(actor, payload.business_id)

    if (!businessId) {
      return response.forbidden({
        success: false,
        error: { code: 'BUSINESS_SCOPE_REQUIRED', message: 'User is not mapped to any business' },
      })
    }

    if (actor.role !== 'super_admin' && businessId !== actor.businessId) {
      return response.forbidden({
        success: false,
        error: {
          code: 'BUSINESS_ACCESS_DENIED',
          message: 'You can only create users in your own business',
        },
      })
    }

    const business = await Business.query().where('id', businessId).whereNull('deleted_at').first()
    if (!business) {
      return response.notFound({
        success: false,
        error: {
          code: 'BUSINESS_NOT_FOUND',
          message: 'Business not found',
        },
      })
    }

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
    if (payload.phone) {
      const existingPhone = await User.findBy('phone', payload.phone)
      if (existingPhone) {
        return response.conflict({
          success: false,
          error: {
            code: 'PHONE_EXISTS',
            message: `A user with phone "${payload.phone}" already exists.`,
          },
        })
      }
    }

    const user = await User.create({
      businessId,
      fullName: payload.name,
      email: payload.email,
      phone: payload.phone ?? null,
      passwordHash: payload.password,
      role: payload.role ?? 'admin',
      isEmailVerified: true,
      isActive: true,
    })

    return response.created({ success: true, data: user.serialize() })
  }

  async update({ params, request, response, auth }: HttpContext) {
    const actor = auth.getUserOrFail()
    const userQuery = User.query().where('id', params.id)
    if (actor.role !== 'super_admin') {
      if (!actor.businessId) {
        return response.forbidden({
          success: false,
          error: { code: 'BUSINESS_SCOPE_REQUIRED', message: 'User is not mapped to any business' },
        })
      }
      userQuery.where('business_id', actor.businessId)
    }
    const user = await userQuery.firstOrFail()

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
    if (payload.phone && payload.phone !== user.phone) {
      const conflict = await User.findBy('phone', payload.phone)
      if (conflict) {
        return response.conflict({
          success: false,
          error: {
            code: 'PHONE_CONFLICT',
            message: `Phone "${payload.phone}" is already in use.`,
          },
        })
      }
    }

    if (payload.name !== undefined) user.fullName = payload.name
    if (payload.email !== undefined) user.email = payload.email
    if (payload.phone !== undefined) user.phone = payload.phone ?? null
    if (payload.role !== undefined) user.role = payload.role
    if (payload.isActive !== undefined) user.isActive = payload.isActive
    if (payload.password !== undefined) user.passwordHash = payload.password

    await user.save()

    return response.ok({ success: true, data: user.serialize() })
  }

  async destroy({ params, response, auth }: HttpContext) {
    const actor = auth.getUserOrFail()
    const userQuery = User.query().where('id', params.id)
    if (actor.role !== 'super_admin') {
      if (!actor.businessId) {
        return response.forbidden({
          success: false,
          error: { code: 'BUSINESS_SCOPE_REQUIRED', message: 'User is not mapped to any business' },
        })
      }
      userQuery.where('business_id', actor.businessId)
    }
    const user = await userQuery.firstOrFail()

    user.isActive = false
    await user.save()

    return response.ok({ success: true, message: 'User deactivated successfully.' })
  }
}
