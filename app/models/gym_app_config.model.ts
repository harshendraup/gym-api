import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Gym from './gym.model.js'

// ─── Per-module feature flag shapes ──────────────────────────────────────────

export interface AuthFeatures {
  otp: boolean
  email_password: boolean
  social_login: boolean
}

export interface WorkoutFeatures {
  enabled: boolean
  ai_suggestions: boolean
  video_exercises: boolean
}

export interface DietFeatures {
  enabled: boolean
  meal_plans: boolean
  calorie_tracking: boolean
}

export interface ProgressFeatures {
  bmi: boolean
  measurements: boolean
  transformation: boolean
  body_fat: boolean
}

export interface MembershipFeatures {
  enabled: boolean
  renewal: boolean
  offers: boolean
  freeze: boolean
}

export interface AttendanceFeatures {
  enabled: boolean
  qr_checkin: boolean
  manual: boolean
  face_recognition: boolean
}

export interface TrainerFeatures {
  enabled: boolean
  personal_training: boolean
  trainer_chat: boolean
}

export interface PaymentFeatures {
  enabled: boolean
  upi: boolean
  cards: boolean
  wallets: boolean
  invoices: boolean
  razorpay: boolean
}

export interface NotificationFeatures {
  push: boolean
  sms: boolean
  email: boolean
  whatsapp: boolean
}

export interface EngagementFeatures {
  referrals: boolean
  challenges: boolean
  offers: boolean
  leaderboard: boolean
}

export interface IntegrationKeys {
  maps_key: string | null
  fcm_sender_id: string | null
  video_service: string | null
  video_service_key: string | null
}

// ─── Model ───────────────────────────────────────────────────────────────────

export default class GymAppConfig extends BaseModel {
  static table = 'gym_app_configs'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare gymId: string

  // Feature flags
  @column()
  declare featuresAuth: AuthFeatures

  @column()
  declare featuresWorkout: WorkoutFeatures

  @column()
  declare featuresDiet: DietFeatures

  @column()
  declare featuresProgress: ProgressFeatures

  @column()
  declare featuresMembership: MembershipFeatures

  @column()
  declare featuresAttendance: AttendanceFeatures

  @column()
  declare featuresTrainer: TrainerFeatures

  @column()
  declare featuresPayment: PaymentFeatures

  @column()
  declare featuresNotifications: NotificationFeatures

  @column()
  declare featuresEngagement: EngagementFeatures

  // Onboarding
  @column()
  declare onboardingMode: 'gym_code' | 'qr' | 'invite'

  @column()
  declare inviteRequired: boolean

  // App version
  @column()
  declare minSupportedVersionIos: string

  @column()
  declare minSupportedVersionAndroid: string

  @column()
  declare latestVersionIos: string

  @column()
  declare latestVersionAndroid: string

  @column()
  declare updateUrlIos: string | null

  @column()
  declare updateUrlAndroid: string | null

  @column()
  declare forceUpdateIos: boolean

  @column()
  declare forceUpdateAndroid: boolean

  // Third-party keys
  @column()
  declare integrationKeys: IntegrationKeys

  @column()
  declare isActive: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Gym)
  declare gym: BelongsTo<typeof Gym>
}
