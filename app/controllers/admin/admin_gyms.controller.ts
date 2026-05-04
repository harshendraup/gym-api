import type { HttpContext } from '@adonisjs/core/http'
import Gym from '#models/gym.model'
import db from '@adonisjs/lucid/services/db'
import vine from '@vinejs/vine'

const statusValidator = vine.compile(
  vine.object({
    status: vine.enum(['active', 'suspended', 'trial', 'expired']),
    reason: vine.string().trim().optional(),
  })
)

const createGymValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(2).maxLength(150),
    email: vine.string().email().trim().optional(),
    phone: vine.string().trim().optional(),
    city: vine.string().trim().optional(),
    state: vine.string().trim().optional(),
  })
)

export default class AdminGymsController {
  async index({ request, response }: HttpContext) {
    const page = Number(request.qs().page ?? 1)
    const search = request.qs().search as string | undefined
    const status = request.qs().status as string | undefined

    const query = Gym.query()
      .preload('owner')
      .whereNull('deleted_at')

    if (status) query.where('status', status)
    if (search) {
      query.where((q) => {
        q.whereILike('name', `%${search}%`)
          .orWhereILike('gym_code', `%${search}%`)
      })
    }

    const gyms = await query.orderBy('created_at', 'desc').paginate(page, 20)

    return response.ok({
      success: true,
      data: gyms.all().map((g) => g.serialize()),
      meta: gyms.getMeta(),
    })
  }

  async store({ request, response, auth }: HttpContext) {
    const payload = await request.validateUsing(createGymValidator)
    const adminUser = auth.getUserOrFail()

    const slug = payload.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    const slugExists = await db.from('gyms').whereILike('slug', slug).first()
    const finalSlug = slugExists ? `${slug}-${Date.now()}` : slug

    const gymCode = payload.name
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase()
      .slice(0, 6)
      .padEnd(4, '0')

    const codeExists = await db.from('gyms').where('gym_code', gymCode).first()
    const finalCode = codeExists ? gymCode + Math.floor(Math.random() * 90 + 10) : gymCode

    const gym = await Gym.create({
      name: payload.name,
      slug: finalSlug,
      gymCode: finalCode,
      email: payload.email ?? null,
      phone: payload.phone ?? null,
      city: payload.city ?? null,
      state: payload.state ?? null,
      ownerId: adminUser.id,
      status: 'active',
      isVerified: true,
    })

    return response.created({ success: true, data: gym.serialize() })
  }

  async show({ params, response }: HttpContext) {
    const gym = await Gym.query()
      .where('id', params.id)
      .preload('owner')
      .preload('branches')
      .firstOrFail()

    // Attach member count
    const memberCount = await db
      .from('gym_members')
      .where('gym_id', gym.id)
      .whereNull('deleted_at')
      .count('* as total')
      .first()

    return response.ok({
      success: true,
      data: { ...gym.serialize(), memberCount: Number(memberCount?.total ?? 0) },
    })
  }

  async updateStatus({ params, request, response }: HttpContext) {
    const { status, reason } = await request.validateUsing(statusValidator)
    const gym = await Gym.findOrFail(params.id)
    gym.status = status
    await gym.save()
    return response.ok({ success: true, data: gym.serialize() })
  }

  async verify({ params, response }: HttpContext) {
    const gym = await Gym.findOrFail(params.id)
    gym.isVerified = true
    gym.verifiedAt = new Date() as any
    await gym.save()
    return response.ok({ success: true, data: gym.serialize() })
  }
}
