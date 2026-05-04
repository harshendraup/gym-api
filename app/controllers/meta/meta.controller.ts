import type { HttpContext } from '@adonisjs/core/http'
import { MetaService } from '#services/meta.service'
import { metaBodyValidator, upsertAppConfigValidator } from '#validators/meta.validator'
import Gym from '#models/gym.model'
import GymAppConfig from '#models/gym_app_config.model'

const metaService = new MetaService()

export default class MetaController {
  /**
   * POST /api/v1/meta
   *
   * Public bootstrap endpoint — called on every app launch.
   * Accepts a rich body with business_key, platform, app_version,
   * device info, locale, and timezone. Returns all branding, feature
   * flags, and runtime config for the gym. Response is Redis-cached
   * (5 min) keyed by business_key × platform × locale.
   */
  async show({ request, response }: HttpContext) {
    const body = await request.validateUsing(metaBodyValidator)

    const {
      business_key,
      platform,
      app_version,
      device,
      locale,
      timezone,
    } = body

    try {
      const meta = await metaService.getAppMeta({
        businessKey: business_key,
        platform: platform as 'ios' | 'android' | 'web' | undefined,
        appVersion: app_version,
        device,
        locale,
        timezone,
      })

      return response.ok({
        success: true,
        data: meta,
        meta: {
          business_key,
          platform: platform ?? 'android',
          app_version: app_version ?? null,
          locale: locale ?? 'en',
          timezone: timezone ?? null,
          device: device ?? null,
          served_at: new Date().toISOString(),
          cache_ttl: 300,
        },
      })
    } catch (error: any) {
      if (error.code === 'E_ROW_NOT_FOUND') {
        return response.notFound({
          success: false,
          error: {
            code: 'GYM_NOT_FOUND',
            message: `No active gym found for business_key "${business_key}"`,
          },
        })
      }
      throw error
    }
  }

  // ─── Admin: get config ────────────────────────────────────────────────────

  async getConfig({ params, response }: HttpContext) {
    await Gym.query().where('id', params.gymId).whereNull('deleted_at').firstOrFail()

    const config = await GymAppConfig.findBy('gym_id', params.gymId)

    return response.ok({ success: true, data: config?.serialize() ?? null })
  }

  // ─── Admin: create / update config ───────────────────────────────────────

  async upsertConfig({ params, request, response }: HttpContext) {
    const gym = await Gym.query()
      .where('id', params.gymId)
      .whereNull('deleted_at')
      .firstOrFail()

    const payload = await request.validateUsing(upsertAppConfigValidator)

    const config = await metaService.upsertConfig(gym.id, payload as Record<string, unknown>)

    // Bust cache for all platforms so next launch gets fresh data
    await metaService.invalidateCache(gym.slug)

    return response.ok({ success: true, data: config.serialize() })
  }
}
