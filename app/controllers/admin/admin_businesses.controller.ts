import { DateTime } from 'luxon'
import type { HttpContext } from '@adonisjs/core/http'
import Business from '#models/business.model'
import {
  createBusinessValidator,
  updateBusinessValidator,
  updateBusinessStatusValidator,
} from '#validators/business.validator'
import string from '@adonisjs/core/helpers/string'

export default class AdminBusinessesController {
  async index({ request, response }: HttpContext) {
    const page = Number(request.qs().page ?? 1)
    const search = request.qs().search as string | undefined
    const status = request.qs().status as string | undefined
    const type = request.qs().type as string | undefined

    const query = Business.query().preload('creator').whereNull('deleted_at')

    if (status) query.where('status', status)
    if (type) query.where('type', type)
    if (search) {
      query.where((q) => {
        q.whereILike('name', `%${search}%`)
          .orWhereILike('legal_name', `%${search}%`)
          .orWhereILike('email', `%${search}%`)
          .orWhereILike('business_key', `%${search}%`)
      })
    }

    const businesses = await query.orderBy('created_at', 'desc').paginate(page, 20)

    return response.ok({
      success: true,
      data: businesses.all().map((b) => b.serialize()),
      meta: businesses.getMeta(),
    })
  }

  async show({ params, response }: HttpContext) {
    const business = await Business.query()
      .where('id', params.id)
      .whereNull('deleted_at')
      .preload('creator')
      .firstOrFail()

    return response.ok({ success: true, data: business.serialize() })
  }

  async store({ auth, request, response }: HttpContext) {
    const payload = await request.validateUsing(createBusinessValidator)
    const user = auth.getUserOrFail()

    const slug = string.slug(payload.name, { lower: true, strict: true })

    const existing = await Business.query().whereILike('slug', slug).whereNull('deleted_at').first()
    const finalSlug = existing ? `${slug}-${Date.now()}` : slug

    // Use provided business_key or fall back to the generated slug
    const businessKey = payload.business_key ?? finalSlug

    const keyConflict = await Business.query()
      .where('business_key', businessKey)
      .whereNull('deleted_at')
      .first()
    if (keyConflict) {
      return response.conflict({
        success: false,
        error: {
          code: 'BUSINESS_KEY_CONFLICT',
          message: `business_key "${businessKey}" is already in use.`,
        },
      })
    }

    const business = await Business.create({
      ...payload,
      slug,
      businessKey,
      createdBy: user.id,
      status: 'pending',
      metadata: payload.metadata ?? {},
    })

    await business.load('creator')

    return response.created({ success: true, data: business.serialize() })
  }

  async update({ params, request, response }: HttpContext) {
    const business = await Business.query()
      .where('id', params.id)
      .whereNull('deleted_at')
      .firstOrFail()

    const payload = await request.validateUsing(updateBusinessValidator)

    if (payload.name && payload.name !== business.name) {
      const slug = string.slug(payload.name, { lower: true, strict: true })
      const existing = await Business.query()
        .whereILike('slug', slug)
        .whereNull('deleted_at')
        .whereNot('id', business.id)
        .first()
      if (existing) {
        return response.conflict({
          success: false,
          error: { code: 'SLUG_CONFLICT', message: 'A business with this name already exists.' },
        })
      }
      business.slug = slug
    }

    if (payload.business_key && payload.business_key !== business.businessKey) {
      const keyConflict = await Business.query()
        .where('business_key', payload.business_key)
        .whereNull('deleted_at')
        .whereNot('id', business.id)
        .first()
      if (keyConflict) {
        return response.conflict({
          success: false,
          error: {
            code: 'BUSINESS_KEY_CONFLICT',
            message: `business_key "${payload.business_key}" is already in use.`,
          },
        })
      }
      business.businessKey = payload.business_key
    }

    business.merge(payload)
    await business.save()
    await business.load('creator')

    return response.ok({ success: true, data: business.serialize() })
  }

  async updateStatus({ params, request, response }: HttpContext) {
    const business = await Business.query()
      .where('id', params.id)
      .whereNull('deleted_at')
      .firstOrFail()

    const { status } = await request.validateUsing(updateBusinessStatusValidator)
    business.status = status
    await business.save()

    return response.ok({ success: true, data: business.serialize() })
  }

  async destroy({ params, response }: HttpContext) {
    const business = await Business.query()
      .where('id', params.id)
      .whereNull('deleted_at')
      .firstOrFail()

    business.deletedAt = DateTime.now()
    await business.save()

    return response.ok({ success: true, message: 'Business deleted successfully.' })
  }
}
