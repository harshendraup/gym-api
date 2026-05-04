import vine from '@vinejs/vine'

export const metaBodyValidator = vine.compile(
  vine.object({
    business_key: vine.string().trim().minLength(2).maxLength(150),

    platform: vine.enum(['ios', 'android', 'web']).optional(),

    app_version: vine
      .string()
      .trim()
      .regex(/^\d+\.\d+(\.\d+)?$/)
      .optional(),

    device: vine
      .object({
        device_id: vine.string().trim().maxLength(255),
        os_version: vine.string().trim().maxLength(20).optional(),
        model: vine.string().trim().maxLength(100).optional(),
      })
      .optional(),

    locale: vine.string().trim().maxLength(10).optional(),   // e.g. "en", "hi", "en-IN"
    timezone: vine.string().trim().maxLength(50).optional(), // e.g. "Asia/Kolkata"
  })
)

export const upsertAppConfigValidator = vine.compile(
  vine.object({
    features_auth: vine
      .object({
        otp: vine.boolean(),
        email_password: vine.boolean(),
        social_login: vine.boolean(),
      })
      .optional(),

    features_workout: vine
      .object({
        enabled: vine.boolean(),
        ai_suggestions: vine.boolean(),
        video_exercises: vine.boolean(),
      })
      .optional(),

    features_diet: vine
      .object({
        enabled: vine.boolean(),
        meal_plans: vine.boolean(),
        calorie_tracking: vine.boolean(),
      })
      .optional(),

    features_progress: vine
      .object({
        bmi: vine.boolean(),
        measurements: vine.boolean(),
        transformation: vine.boolean(),
        body_fat: vine.boolean(),
      })
      .optional(),

    features_membership: vine
      .object({
        enabled: vine.boolean(),
        renewal: vine.boolean(),
        offers: vine.boolean(),
        freeze: vine.boolean(),
      })
      .optional(),

    features_attendance: vine
      .object({
        enabled: vine.boolean(),
        qr_checkin: vine.boolean(),
        manual: vine.boolean(),
        face_recognition: vine.boolean(),
      })
      .optional(),

    features_trainer: vine
      .object({
        enabled: vine.boolean(),
        personal_training: vine.boolean(),
        trainer_chat: vine.boolean(),
      })
      .optional(),

    features_payment: vine
      .object({
        enabled: vine.boolean(),
        upi: vine.boolean(),
        cards: vine.boolean(),
        wallets: vine.boolean(),
        invoices: vine.boolean(),
        razorpay: vine.boolean(),
      })
      .optional(),

    features_notifications: vine
      .object({
        push: vine.boolean(),
        sms: vine.boolean(),
        email: vine.boolean(),
        whatsapp: vine.boolean(),
      })
      .optional(),

    features_engagement: vine
      .object({
        referrals: vine.boolean(),
        challenges: vine.boolean(),
        offers: vine.boolean(),
        leaderboard: vine.boolean(),
      })
      .optional(),

    onboarding_mode: vine.enum(['gym_code', 'qr', 'invite']).optional(),
    invite_required: vine.boolean().optional(),

    min_supported_version_ios: vine
      .string()
      .trim()
      .regex(/^\d+\.\d+(\.\d+)?$/)
      .optional(),
    min_supported_version_android: vine
      .string()
      .trim()
      .regex(/^\d+\.\d+(\.\d+)?$/)
      .optional(),
    latest_version_ios: vine
      .string()
      .trim()
      .regex(/^\d+\.\d+(\.\d+)?$/)
      .optional(),
    latest_version_android: vine
      .string()
      .trim()
      .regex(/^\d+\.\d+(\.\d+)?$/)
      .optional(),
    update_url_ios: vine.string().trim().url().optional(),
    update_url_android: vine.string().trim().url().optional(),
    force_update_ios: vine.boolean().optional(),
    force_update_android: vine.boolean().optional(),

    integration_keys: vine
      .object({
        maps_key: vine.string().trim().nullable().optional(),
        fcm_sender_id: vine.string().trim().nullable().optional(),
        video_service: vine.string().trim().nullable().optional(),
        video_service_key: vine.string().trim().nullable().optional(),
      })
      .optional(),
  })
)
