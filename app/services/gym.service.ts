import Gym from '#models/gym.model'
import GymBranch from '#models/gym_branch.model'
import UserGymRole from '#models/user_gym_role.model'
import QrCode from '#models/qr_code.model'
import { generateGymCode, generateQrToken } from '#helpers/crypto.helper'
import { generateQrImage } from '#helpers/qr.helper'
import slugify from 'slugify'
import db from '@adonisjs/lucid/services/db'

interface CreateGymInput {
  ownerId: string
  name: string
  email?: string
  phone?: string
}

interface UpdateGymInput {
  name?: string
  tagline?: string
  description?: string
  email?: string
  phone?: string
  website?: string
  addressLine1?: string
  addressLine2?: string
  city?: string
  state?: string
  pincode?: string
  latitude?: number
  longitude?: number
  logoUrl?: string
  bannerUrl?: string
  primaryColor?: string
  secondaryColor?: string
  accentColor?: string
  facilities?: string[]
  timings?: Record<string, { open: string; close: string }>
  settings?: Record<string, unknown>
}

export class GymService {
  async createGym(input: CreateGymInput): Promise<Gym> {
    const baseSlug = slugify(input.name, { lower: true, strict: true })
    const slug = await this.uniqueSlug(baseSlug)
    const gymCode = generateGymCode()

    return db.transaction(async (trx) => {
      const gym = await Gym.create(
        {
          ownerId: input.ownerId,
          name: input.name,
          slug,
          gymCode,
          email: input.email ?? null,
          phone: input.phone ?? null,
          status: 'trial',
        },
        { client: trx }
      )

      // Create default main branch
      const branch = await GymBranch.create(
        {
          gymId: gym.id,
          name: `${input.name} — Main`,
          code: 'HQ',
          isMainBranch: true,
          isActive: true,
        },
        { client: trx }
      )

      // Assign owner role
      await UserGymRole.create(
        {
          userId: input.ownerId,
          gymId: gym.id,
          role: 'gym_owner',
          isActive: true,
        },
        { client: trx }
      )

      // Generate attendance QR for main branch
      const token = generateQrToken({ branchId: branch.id, gymId: gym.id, type: 'attendance' })
      const qrImageUrl = await generateQrImage(token)

      await QrCode.create(
        { gymId: gym.id, branchId: branch.id, token, qrImageUrl, isActive: true },
        { client: trx }
      )

      return gym
    })
  }

  async updateGym(gymId: string, input: UpdateGymInput): Promise<Gym> {
    const gym = await Gym.query()
      .where('id', gymId)
      .whereNull('deleted_at')
      .firstOrFail()

    if (input.name && input.name !== gym.name) {
      const baseSlug = slugify(input.name, { lower: true, strict: true })
      input['slug'] = await this.uniqueSlug(baseSlug, gymId)
    }

    gym.merge(input as any)
    await gym.save()
    return gym
  }

  async getBrandingConfig(gymId: string) {
    const gym = await Gym.query()
      .where('id', gymId)
      .select('id', 'name', 'logo_url', 'banner_url', 'primary_color', 'secondary_color', 'accent_color', 'tagline', 'facilities', 'phone', 'email', 'app_branding', 'settings')
      .whereNull('deleted_at')
      .firstOrFail()

    return gym.brandingConfig
  }

  async getGymByCode(gymCode: string): Promise<Gym | null> {
    return Gym.query()
      .where('gym_code', gymCode.toUpperCase())
      .where('status', 'active')
      .whereNull('deleted_at')
      .first()
  }

  private async uniqueSlug(base: string, excludeId?: string): Promise<string> {
    let slug = base
    let counter = 1

    while (true) {
      const query = Gym.query().where('slug', slug)
      if (excludeId) query.whereNot('id', excludeId)
      const existing = await query.first()
      if (!existing) return slug
      slug = `${base}-${counter++}`
    }
  }
}
