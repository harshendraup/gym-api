import { DateTime } from 'luxon'
import type { HttpContext } from '@adonisjs/core/http'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import env from '#start/env'
import Business from '#models/business.model'
import GymMember from '#models/gym_member.model'
import db from '@adonisjs/lucid/services/db'
import {
  createBusinessValidator,
  updateBusinessValidator,
  updateBusinessStatusValidator,
} from '#validators/business.validator'
import string from '@adonisjs/core/helpers/string'

export default class AdminBusinessesController {
  private pickLogoFile(request: HttpContext['request']) {
    return (
      request.file('logo') ??
      request.file('businessLogo') ??
      request.file('business_logo') ??
      request.file('image')
    )
  }

  private buildS3Client() {
    const region = env.get('S3_REGION') ?? env.get('AWS_REGION')
    const accessKeyId = env.get('S3_ACCESS_KEY') ?? env.get('AWS_ACCESS_KEY_ID')
    const secretAccessKey = env.get('S3_SECRET_KEY') ?? env.get('AWS_SECRET_ACCESS_KEY')
    const endpoint = env.get('S3_ENDPOINT')

    if (!region || !accessKeyId || !secretAccessKey) throw new Error('S3_CONFIG_MISSING')

    return new S3Client({
      region,
      ...(endpoint ? { endpoint } : {}),
      credentials: { accessKeyId, secretAccessKey },
    })
  }

  private extractObjectKeyFromUrl(url: string): string | null {
    try {
      const parsed = new URL(url)
      const key = parsed.pathname.replace(/^\/+/, '')
      return key.length ? key : null
    } catch {
      return null
    }
  }

  private async removeOldLogoFromS3(oldLogoUrl: string): Promise<void> {
    const bucket = env.get('S3_BUCKET') ?? env.get('AWS_S3_BUCKET')
    const publicUrlBase = env.get('S3_PUBLIC_URL') ?? env.get('AWS_S3_PUBLIC_BASE_URL')
    if (!bucket) return
    if (!oldLogoUrl.startsWith('http://') && !oldLogoUrl.startsWith('https://')) return

    let oldKey: string | null = null
    if (publicUrlBase && oldLogoUrl.startsWith(publicUrlBase.replace(/\/$/, '') + '/')) {
      oldKey = oldLogoUrl.replace(publicUrlBase.replace(/\/$/, '') + '/', '')
    } else {
      oldKey = this.extractObjectKeyFromUrl(oldLogoUrl)
    }

    if (!oldKey) return
    const s3 = this.buildS3Client()
    await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: oldKey }))
  }

  private async processLogoUpload(request: HttpContext['request']): Promise<string | null> {
    const logo = this.pickLogoFile(request)
    const allowedExt = new Set(['jpg', 'jpeg', 'png', 'webp'])
    const maxSizeBytes = 20 * 1024 * 1024

    if (!logo) return null
    // If client sends logo field with no selected file, treat as "no upload".
    if (!logo.tmpPath) throw new Error('INVALID_LOGO_FILE')
    if (!logo.clientName && !logo.size) return null
    if (typeof logo.size === 'number' && logo.size > maxSizeBytes) throw new Error('INVALID_LOGO_FILE')

    const extFromClientName = logo.clientName ? path.extname(logo.clientName).replace('.', '').toLowerCase() : ''
    const extFromPart = (logo.extname ?? '').toLowerCase()
    const ext = extFromClientName || extFromPart
    if (!allowedExt.has(ext)) throw new Error('INVALID_LOGO_FILE')

    const bucket = env.get('S3_BUCKET') ?? env.get('AWS_S3_BUCKET')
    const region = env.get('S3_REGION') ?? env.get('AWS_REGION')
    const publicUrlBase = env.get('S3_PUBLIC_URL') ?? env.get('AWS_S3_PUBLIC_BASE_URL')

    if (!bucket || !region) {
      throw new Error('S3_CONFIG_MISSING')
    }

    const s3 = this.buildS3Client()

    const fileName = `${crypto.randomUUID()}.${ext}`
    const objectKey = `business-logos/${fileName}`
    const content = await readFile(logo.tmpPath)

    await s3.send(new PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      Body: content,
      ContentType: logo.type ?? 'application/octet-stream',
      CacheControl: 'public, max-age=31536000, immutable',
    }))

    if (publicUrlBase) {
      return `${publicUrlBase.replace(/\/$/, '')}/${objectKey}`
    }
    return `https://${bucket}.s3.${region}.amazonaws.com/${objectKey}`
  }

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
    let uploadedLogoPath: string | null = null
    try {
      uploadedLogoPath = await this.processLogoUpload(request)
    } catch (error: any) {
      if (error?.message === 'S3_CONFIG_MISSING') {
        return response.internalServerError({
          success: false,
          error: {
            code: 'S3_CONFIG_MISSING',
            message: 'S3 configuration is missing. Set either S3_* or AWS_* S3 env vars.',
          },
        })
      }
      return response.unprocessableEntity({
        success: false,
        error: {
          code: 'INVALID_LOGO_FILE',
          message: 'Invalid logo file. Allowed types: jpg, jpeg, png, webp. Max size: 20mb.',
        },
      })
    }

    const slug = string.slug(payload.name, { lower: true, strict: true })

    const existing = await Business.query().whereILike('slug', slug).whereNull('deleted_at').first()
    const finalSlug = existing ? `${slug}-${Date.now()}` : slug

    // Accept both business_key and businessKey for multipart clients.
    const businessKeyInput = request.input('businessKey') as string | undefined
    const businessKey = payload.business_key ?? businessKeyInput ?? finalSlug

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
      logoUrl: uploadedLogoPath ?? payload.logoUrl ?? null,
      slug: finalSlug,
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
    let uploadedLogoPath: string | null = null
    try {
      uploadedLogoPath = await this.processLogoUpload(request)
    } catch (error: any) {
      if (error?.message === 'S3_CONFIG_MISSING') {
        return response.internalServerError({
          success: false,
          error: {
            code: 'S3_CONFIG_MISSING',
            message: 'S3 configuration is missing. Set either S3_* or AWS_* S3 env vars.',
          },
        })
      }
      return response.unprocessableEntity({
        success: false,
        error: {
          code: 'INVALID_LOGO_FILE',
          message: 'Invalid logo file. Allowed types: jpg, jpeg, png, webp. Max size: 20mb.',
        },
      })
    }

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

    const businessKeyInput = (payload.business_key ?? request.input('businessKey')) as string | undefined
    if (businessKeyInput && businessKeyInput !== business.businessKey) {
      const keyConflict = await Business.query()
        .where('business_key', businessKeyInput)
        .whereNull('deleted_at')
        .whereNot('id', business.id)
        .first()
      if (keyConflict) {
        return response.conflict({
          success: false,
          error: {
            code: 'BUSINESS_KEY_CONFLICT',
            message: `business_key "${businessKeyInput}" is already in use.`,
          },
        })
      }
      business.businessKey = businessKeyInput
    }

    const previousLogoUrl = business.logoUrl
    business.merge({
      ...payload,
      ...(uploadedLogoPath && { logoUrl: uploadedLogoPath }),
    })
    await business.save()
    if (uploadedLogoPath && previousLogoUrl && previousLogoUrl !== uploadedLogoPath) {
      await this.removeOldLogoFromS3(previousLogoUrl)
    }
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

  async members({ params, request, response }: HttpContext) {
    const page = Number(request.qs().page ?? 1)
    const search = request.qs().search as string | undefined
    const status = request.qs().status as string | undefined

    const business = await Business.query()
      .where('id', params.id)
      .whereNull('deleted_at')
      .firstOrFail()

    const gymRows = await db
      .from('gyms')
      .join('users', 'gyms.owner_id', 'users.id')
      .where('users.business_id', business.id)
      .whereNull('gyms.deleted_at')
      .select('gyms.id')
    const gymIds: string[] = gymRows.map((r: any) => r.id)

    const query = GymMember.query()
      .whereIn('gym_id', gymIds.length ? gymIds : ['__none__'])
      .whereNull('deleted_at')
      .preload('user')
      .preload('gym')
      .preload('activeSubscription', (q) => q.preload('membershipPlan'))

    if (status) query.where('status', status)
    if (search) {
      query.whereHas('user', (q) => {
        q.whereILike('full_name', `%${search}%`).orWhereILike('email', `%${search}%`)
      })
    }

    const members = await query.orderBy('created_at', 'desc').paginate(page, 20)

    return response.ok({
      success: true,
      data: members.all().map((m) => m.serialize()),
      meta: members.getMeta(),
      business: { id: business.id, name: business.name, slug: business.slug },
    })
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
