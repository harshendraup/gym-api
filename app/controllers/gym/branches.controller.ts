import type { HttpContext } from '@adonisjs/core/http'
import GymBranch from '#models/gym_branch.model'
import QrCode from '#models/qr_code.model'
import { generateQrToken } from '#helpers/crypto.helper'
import { generateQrImage } from '#helpers/qr.helper'
import vine from '@vinejs/vine'

const createBranchValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(2).maxLength(150),
    code: vine.string().trim().toUpperCase().maxLength(20),
    phone: vine.string().trim().optional(),
    email: vine.string().trim().email().optional(),
    addressLine1: vine.string().trim().optional(),
    city: vine.string().trim().optional(),
    state: vine.string().trim().optional(),
    pincode: vine.string().trim().optional(),
    latitude: vine.number().optional(),
    longitude: vine.number().optional(),
    timings: vine.record(vine.object({ open: vine.string(), close: vine.string() })).optional(),
    isMainBranch: vine.boolean().optional(),
  })
)

export default class BranchesController {
  async index({ response, gymId }: HttpContext) {
    const branches = await GymBranch.query()
      .where('gym_id', gymId)
      .where('is_active', true)
      .whereNull('deleted_at')
      .orderBy('is_main_branch', 'desc')
      .orderBy('name', 'asc')

    return response.ok({ success: true, data: branches.map((b) => b.serialize()) })
  }

  async store({ request, response, gymId }: HttpContext) {
    const payload = await request.validateUsing(createBranchValidator)

    const branch = await GymBranch.create({ gymId, ...payload, isActive: true })

    // Auto-generate QR for new branch
    const token = generateQrToken({ branchId: branch.id, gymId, type: 'attendance' })
    const qrImageUrl = await generateQrImage(token)
    await QrCode.create({ gymId, branchId: branch.id, token, qrImageUrl, isActive: true })

    return response.created({ success: true, data: branch.serialize() })
  }

  async show({ params, response, gymId }: HttpContext) {
    const branch = await GymBranch.query()
      .where('id', params.id)
      .where('gym_id', gymId)
      .whereNull('deleted_at')
      .firstOrFail()

    return response.ok({ success: true, data: branch.serialize() })
  }

  async update({ params, request, response, gymId }: HttpContext) {
    const branch = await GymBranch.query()
      .where('id', params.id)
      .where('gym_id', gymId)
      .firstOrFail()

    const payload = await request.validateUsing(createBranchValidator)
    branch.merge(payload)
    await branch.save()
    return response.ok({ success: true, data: branch.serialize() })
  }

  async destroy({ params, response, gymId }: HttpContext) {
    const branch = await GymBranch.query()
      .where('id', params.id)
      .where('gym_id', gymId)
      .where('is_main_branch', false)  // Cannot delete main branch
      .firstOrFail()

    branch.deletedAt = new Date() as any
    await branch.save()
    return response.ok({ success: true, data: { message: 'Branch deleted' } })
  }
}
