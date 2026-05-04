import redis from '@adonisjs/redis/services/main'
import Gym from '#models/gym.model'
import GymAppConfig from '#models/gym_app_config.model'
import Business from '#models/business.model'

// ─── Types ────────────────────────────────────────────────────────────────────

type Platform = 'ios' | 'android' | 'web'

export interface DeviceInfo {
  device_id: string
  os_version?: string
  model?: string
}

export interface MetaInput {
  businessKey: string
  platform?: Platform
  appVersion?: string
  device?: DeviceInfo
  locale?: string
  timezone?: string
}

interface AppConfigSection {
  force_update: boolean
  min_supported_version: string
  latest_version: string
  update_url: string | null
}

interface MetaResponse {
  gym: Record<string, unknown>
  branding: Record<string, unknown>
  onboarding: Record<string, unknown>
  features: Record<string, unknown>
  app_config: AppConfigSection
  integrations: Record<string, unknown>
}

// ─── Cache config ─────────────────────────────────────────────────────────────

const CACHE_TTL = 300 // 5 minutes

// locale is included in the key so locale-specific variants can be cached independently
function cacheKey(businessKey: string, platform: string, locale: string): string {
  return `meta:${businessKey}:${platform}:${locale}`
}

// ─── Semver comparison ────────────────────────────────────────────────────────

function parseSemver(version: string): [number, number, number] {
  const parts = version.split('.').map(Number)
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0]
}

function isVersionBelow(version: string, minVersion: string): boolean {
  const [ma, mi, pa] = parseSemver(version)
  const [mb, mib, pb] = parseSemver(minVersion)
  if (ma !== mb) return ma < mb
  if (mi !== mib) return mi < mib
  return pa < pb
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class MetaService {
  async getAppMeta(input: MetaInput): Promise<MetaResponse> {
    const platform = input.platform ?? 'android'
    const locale = input.locale ?? 'en'
    const key = cacheKey(input.businessKey, platform, locale)

    const cached = await redis.get(key)
    if (cached) {
      return JSON.parse(cached) as MetaResponse
    }

    const gym = await this.resolveGym(input.businessKey)

    const config = await GymAppConfig.query()
      .where('gym_id', gym.id)
      .where('is_active', true)
      .first()

    const meta = this.buildMetaResponse(gym, config, platform, input.appVersion)

    await redis.setex(key, CACHE_TTL, JSON.stringify(meta))

    return meta
  }

  async invalidateCache(gymSlug: string): Promise<void> {
    // Pattern-delete all cached variants (platform × locale) for this gym
    const pattern = `meta:${gymSlug}:*`
    const keys = await redis.keys(pattern)
    if (keys.length) await redis.del(...keys)
  }

  async upsertConfig(
    gymId: string,
    payload: Record<string, unknown>
  ): Promise<GymAppConfig> {
    let config = await GymAppConfig.findBy('gym_id', gymId)

    if (!config) {
      config = new GymAppConfig()
      config.gymId = gymId
    }

    if (payload.features_auth !== undefined)
      config.featuresAuth = payload.features_auth as any
    if (payload.features_workout !== undefined)
      config.featuresWorkout = payload.features_workout as any
    if (payload.features_diet !== undefined)
      config.featuresDiet = payload.features_diet as any
    if (payload.features_progress !== undefined)
      config.featuresProgress = payload.features_progress as any
    if (payload.features_membership !== undefined)
      config.featuresMembership = payload.features_membership as any
    if (payload.features_attendance !== undefined)
      config.featuresAttendance = payload.features_attendance as any
    if (payload.features_trainer !== undefined)
      config.featuresTrainer = payload.features_trainer as any
    if (payload.features_payment !== undefined)
      config.featuresPayment = payload.features_payment as any
    if (payload.features_notifications !== undefined)
      config.featuresNotifications = payload.features_notifications as any
    if (payload.features_engagement !== undefined)
      config.featuresEngagement = payload.features_engagement as any

    if (payload.onboarding_mode !== undefined)
      config.onboardingMode = payload.onboarding_mode as any
    if (payload.invite_required !== undefined)
      config.inviteRequired = payload.invite_required as boolean

    if (payload.min_supported_version_ios !== undefined)
      config.minSupportedVersionIos = payload.min_supported_version_ios as string
    if (payload.min_supported_version_android !== undefined)
      config.minSupportedVersionAndroid = payload.min_supported_version_android as string
    if (payload.latest_version_ios !== undefined)
      config.latestVersionIos = payload.latest_version_ios as string
    if (payload.latest_version_android !== undefined)
      config.latestVersionAndroid = payload.latest_version_android as string
    if (payload.update_url_ios !== undefined)
      config.updateUrlIos = (payload.update_url_ios as string) ?? null
    if (payload.update_url_android !== undefined)
      config.updateUrlAndroid = (payload.update_url_android as string) ?? null
    if (payload.force_update_ios !== undefined)
      config.forceUpdateIos = payload.force_update_ios as boolean
    if (payload.force_update_android !== undefined)
      config.forceUpdateAndroid = payload.force_update_android as boolean

    if (payload.integration_keys !== undefined)
      config.integrationKeys = payload.integration_keys as any

    await config.save()
    return config
  }

  // ─── Private ─────────────────────────────────────────────────────────────

  private async resolveGym(businessKey: string): Promise<Gym> {
    const branchQuery = (q: any) => q.where('is_active', true).whereNull('deleted_at')

    // 1. Match against businesses.business_key → find gym via owner_id
    const business = await Business.query()
      .where('business_key', businessKey)
      .where('status', 'active')
      .whereNull('deleted_at')
      .first()

    if (business) {
      const gym = await Gym.query()
        .where('owner_id', business.createdBy)
        .where('status', 'active')
        .whereNull('deleted_at')
        .preload('branches', branchQuery)
        .first()

      if (gym) return gym
    }

    // 2. Fall back: match against gyms.slug directly
    return Gym.query()
      .where('slug', businessKey)
      .where('status', 'active')
      .whereNull('deleted_at')
      .preload('branches', branchQuery)
      .firstOrFail()
  }

  private buildMetaResponse(
    gym: Gym,
    config: GymAppConfig | null,
    platform: Platform,
    appVersion?: string
  ): MetaResponse {
    const isIos = platform === 'ios'

    // Determine force_update from config + optional semver check
    let forceUpdate = isIos
      ? (config?.forceUpdateIos ?? false)
      : (config?.forceUpdateAndroid ?? false)

    const minVersion = isIos
      ? (config?.minSupportedVersionIos ?? '1.0.0')
      : (config?.minSupportedVersionAndroid ?? '1.0.0')

    if (!forceUpdate && appVersion && isVersionBelow(appVersion, minVersion)) {
      forceUpdate = true
    }

    return {
      gym: this.buildGymSection(gym),
      branding: this.buildBrandingSection(gym),
      onboarding: this.buildOnboardingSection(gym, config),
      features: this.buildFeaturesSection(config),
      app_config: {
        force_update: forceUpdate,
        min_supported_version: minVersion,
        latest_version: isIos
          ? (config?.latestVersionIos ?? '1.0.0')
          : (config?.latestVersionAndroid ?? '1.0.0'),
        update_url: isIos
          ? (config?.updateUrlIos ?? null)
          : (config?.updateUrlAndroid ?? null),
      },
      integrations: config?.integrationKeys ?? {
        maps_key: null,
        fcm_sender_id: null,
        video_service: null,
        video_service_key: null,
      },
    }
  }

  private buildGymSection(gym: Gym): Record<string, unknown> {
    return {
      id: gym.id,
      name: gym.name,
      code: gym.gymCode,
      tagline: gym.tagline,
      description: gym.description,
      contact: {
        phone: gym.phone,
        email: gym.email,
        website: gym.website,
      },
      address: {
        line1: gym.addressLine1,
        line2: gym.addressLine2,
        city: gym.city,
        state: gym.state,
        pincode: gym.pincode,
        country: gym.country,
      },
      location: {
        latitude: gym.latitude,
        longitude: gym.longitude,
      },
      facilities: gym.facilities ?? [],
      timings: gym.timings ?? {},
      branches: (gym.branches ?? []).map((b) => ({
        id: b.id,
        name: b.name,
        code: b.code,
        phone: b.phone,
        address: {
          line1: b.addressLine1,
          city: b.city,
          state: b.state,
          pincode: b.pincode,
        },
        location: { latitude: b.latitude, longitude: b.longitude },
        timings: b.timings ?? {},
        is_main: b.isMainBranch,
      })),
    }
  }

  private buildBrandingSection(gym: Gym): Record<string, unknown> {
    return {
      primary_color: gym.primaryColor,
      secondary_color: gym.secondaryColor,
      accent_color: gym.accentColor,
      logo_url: gym.logoUrl,
      banner_url: gym.bannerUrl,
      ...(gym.appBranding ?? {}),
    }
  }

  private buildOnboardingSection(
    gym: Gym,
    config: GymAppConfig | null
  ): Record<string, unknown> {
    return {
      mode: config?.onboardingMode ?? 'gym_code',
      gym_code: gym.gymCode,
      invite_required: config?.inviteRequired ?? false,
    }
  }

  private buildFeaturesSection(config: GymAppConfig | null): Record<string, unknown> {
    return {
      auth: config?.featuresAuth ?? { otp: true, email_password: false, social_login: false },
      workout: config?.featuresWorkout ?? { enabled: true, ai_suggestions: false, video_exercises: true },
      diet: config?.featuresDiet ?? { enabled: true, meal_plans: false, calorie_tracking: true },
      progress: config?.featuresProgress ?? { bmi: true, measurements: true, transformation: false, body_fat: false },
      membership: config?.featuresMembership ?? { enabled: true, renewal: true, offers: false, freeze: true },
      attendance: config?.featuresAttendance ?? { enabled: true, qr_checkin: true, manual: true, face_recognition: false },
      trainer: config?.featuresTrainer ?? { enabled: true, personal_training: false, trainer_chat: false },
      payment: config?.featuresPayment ?? { enabled: true, upi: true, cards: true, wallets: false, invoices: true, razorpay: true },
      notifications: config?.featuresNotifications ?? { push: true, sms: false, email: true, whatsapp: false },
      engagement: config?.featuresEngagement ?? { referrals: false, challenges: false, offers: false, leaderboard: false },
    }
  }
}
