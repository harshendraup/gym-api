import type { HttpContext } from '@adonisjs/core/http'
import { GymService } from '#services/gym.service'
import vine from '@vinejs/vine'

const updateGymValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(2).maxLength(150).optional(),
    tagline: vine.string().trim().maxLength(255).optional(),
    description: vine.string().trim().optional(),
    email: vine.string().trim().email().optional(),
    phone: vine.string().trim().regex(/^[6-9]\d{9}$/).optional(),
    website: vine.string().trim().url().optional(),
    addressLine1: vine.string().trim().optional(),
    addressLine2: vine.string().trim().optional(),
    city: vine.string().trim().optional(),
    state: vine.string().trim().optional(),
    pincode: vine.string().trim().optional(),
    latitude: vine.number().min(-90).max(90).optional(),
    longitude: vine.number().min(-180).max(180).optional(),
    logoUrl: vine.string().trim().url().optional(),
    bannerUrl: vine.string().trim().url().optional(),
    primaryColor: vine.string().trim().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    secondaryColor: vine.string().trim().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    accentColor: vine.string().trim().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    facilities: vine.array(vine.string()).optional(),
    timings: vine.record(vine.object({ open: vine.string(), close: vine.string() })).optional(),
    settings: vine.record(vine.any()).optional(),
  })
)

const gymService = new GymService()

export default class GymController {
  async show({ response, gym }: HttpContext) {
    await gym.load('branches')
    await gym.load('owner')
    return response.ok({ success: true, data: gym.serialize() })
  }

  async update({ request, response, gymId }: HttpContext) {
    const payload = await request.validateUsing(updateGymValidator)
    const updatedGym = await gymService.updateGym(gymId, payload)
    return response.ok({ success: true, data: updatedGym.serialize() })
  }

  async branding({ response, gymId }: HttpContext) {
    const config = await gymService.getBrandingConfig(gymId)
    return response.ok({ success: true, data: config })
  }
}
