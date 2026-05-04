import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'gym_app_configs'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('gen_random_uuid()').knexQuery)
      table.uuid('gym_id').notNullable().unique().references('id').inTable('gyms').onDelete('CASCADE')

      // -----------------------------------------------------------------------
      // Feature flags — one JSONB column per module for partial updates
      // -----------------------------------------------------------------------
      table
        .jsonb('features_auth')
        .defaultTo(
          JSON.stringify({ otp: true, email_password: false, social_login: false })
        )
      table
        .jsonb('features_workout')
        .defaultTo(
          JSON.stringify({ enabled: true, ai_suggestions: false, video_exercises: true })
        )
      table
        .jsonb('features_diet')
        .defaultTo(
          JSON.stringify({ enabled: true, meal_plans: false, calorie_tracking: true })
        )
      table
        .jsonb('features_progress')
        .defaultTo(
          JSON.stringify({ bmi: true, measurements: true, transformation: false, body_fat: false })
        )
      table
        .jsonb('features_membership')
        .defaultTo(
          JSON.stringify({ enabled: true, renewal: true, offers: false, freeze: true })
        )
      table
        .jsonb('features_attendance')
        .defaultTo(
          JSON.stringify({ enabled: true, qr_checkin: true, manual: true, face_recognition: false })
        )
      table
        .jsonb('features_trainer')
        .defaultTo(
          JSON.stringify({ enabled: true, personal_training: false, trainer_chat: false })
        )
      table
        .jsonb('features_payment')
        .defaultTo(
          JSON.stringify({
            enabled: true,
            upi: true,
            cards: true,
            wallets: false,
            invoices: true,
            razorpay: true,
          })
        )
      table
        .jsonb('features_notifications')
        .defaultTo(
          JSON.stringify({ push: true, sms: false, email: true, whatsapp: false })
        )
      table
        .jsonb('features_engagement')
        .defaultTo(
          JSON.stringify({ referrals: false, challenges: false, offers: false, leaderboard: false })
        )

      // -----------------------------------------------------------------------
      // Onboarding config
      // -----------------------------------------------------------------------
      table
        .enum('onboarding_mode', ['gym_code', 'qr', 'invite'])
        .notNullable()
        .defaultTo('gym_code')
      table.boolean('invite_required').defaultTo(false)

      // -----------------------------------------------------------------------
      // App version & force-update (per platform)
      // -----------------------------------------------------------------------
      table.string('min_supported_version_ios', 20).defaultTo('1.0.0')
      table.string('min_supported_version_android', 20).defaultTo('1.0.0')
      table.string('latest_version_ios', 20).defaultTo('1.0.0')
      table.string('latest_version_android', 20).defaultTo('1.0.0')
      table.string('update_url_ios', 500).nullable()
      table.string('update_url_android', 500).nullable()
      table.boolean('force_update_ios').defaultTo(false)
      table.boolean('force_update_android').defaultTo(false)

      // -----------------------------------------------------------------------
      // Third-party integration keys (public/restricted keys only — no secrets)
      // -----------------------------------------------------------------------
      table.jsonb('integration_keys').defaultTo(JSON.stringify({
        maps_key: null,
        fcm_sender_id: null,
        video_service: null,
        video_service_key: null,
      }))

      table.boolean('is_active').defaultTo(true)
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })

    this.schema.raw('CREATE INDEX idx_gym_app_configs_gym ON gym_app_configs(gym_id)')
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
