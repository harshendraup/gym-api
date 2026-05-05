import { DateTime } from 'luxon'
import type { HttpContext } from '@adonisjs/core/http'
import BusinessAdmin from '#models/business_admin.model'
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

    const query = BusinessAdmin.query().whereNull('deleted_at')

    if (businessId) query.where('business_id', businessId)
    if (role) query.where('role', role)
    if (search) {
      query.where((q) => {
        q.whereILike('name', `%${search}%`).orWhereILike('email', `%${search}%`)
      })
    }

    const admins = await query.orderBy('created_at', 'desc').paginate(page, 20)

    return response.ok({
      success: true,
      data: admins.all().map((a) => a.serialize()),
      meta: admins.getMeta(),
    })
  }

  async show({ params, response }: HttpContext) {
    const admin = await BusinessAdmin.query()
      .where('id', params.id)
      .whereNull('deleted_at')
      .firstOrFail()

    return response.ok({ success: true, data: admin.serialize() })
  }

  async store({ request, response }: HttpContext) {
    const payload = await request.validateUsing(createBusinessAdminValidator)

    await Business.query().where('id', payload.business_id).whereNull('deleted_at').firstOrFail()

    const existing = await BusinessAdmin.query()
      .where('email', payload.email)
      .where('business_id', payload.business_id)
      .whereNull('deleted_at')
      .first()

    if (existing) {
      return response.conflict({
        success: false,
        error: {
          code: 'ADMIN_ALREADY_EXISTS',
          message: `An admin with email "${payload.email}" already exists for this business.`,
        },
      })
    }

    const admin = await BusinessAdmin.create({
      businessId: payload.business_id,
      name: payload.name,
      email: payload.email,
      phone: payload.phone ?? null,
      passwordHash: payload.password,
      role: payload.role ?? 'admin',
    })

    return response.created({ success: true, data: admin.serialize() })
  }

  async update({ params, request, response }: HttpContext) {
    const admin = await BusinessAdmin.query()
      .where('id', params.id)
      .whereNull('deleted_at')
      .firstOrFail()

    const payload = await request.validateUsing(updateBusinessAdminValidator)

    if (payload.email && payload.email !== admin.email) {
      const conflict = await BusinessAdmin.query()
        .where('email', payload.email)
        .where('business_id', admin.businessId)
        .whereNull('deleted_at')
        .whereNot('id', admin.id)
        .first()

      if (conflict) {
        return response.conflict({
          success: false,
          error: {
            code: 'EMAIL_CONFLICT',
            message: `Email "${payload.email}" is already used by another admin in this business.`,
          },
        })
      }
    }

    if (payload.name !== undefined) admin.name = payload.name
    if (payload.email !== undefined) admin.email = payload.email
    if (payload.phone !== undefined) admin.phone = payload.phone ?? null
    if (payload.role !== undefined) admin.role = payload.role
    if (payload.isActive !== undefined) admin.isActive = payload.isActive
    if (payload.password !== undefined) admin.passwordHash = payload.password

    await admin.save()

    return response.ok({ success: true, data: admin.serialize() })
  }

  async destroy({ params, response }: HttpContext) {
    const admin = await BusinessAdmin.query()
      .where('id', params.id)
      .whereNull('deleted_at')
      .firstOrFail()

    admin.deletedAt = DateTime.now()
    await admin.save()

    return response.ok({ success: true, message: 'Business admin deleted successfully.' })
  }
}
