import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('device_tokens', (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('gen_random_uuid()').knexQuery)
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.string('token', 512).notNullable()
      table.enum('platform', ['ios', 'android', 'web']).notNullable()
      table.string('device_id', 255).nullable()
      table.boolean('is_active').defaultTo(true)
      table.timestamp('last_used_at').nullable()
      table.timestamp('created_at').notNullable()
      table.unique(['user_id', 'token'])
    })

    this.schema.createTable('notification_templates', (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('gen_random_uuid()').knexQuery)
      table.uuid('gym_id').nullable().references('id').inTable('gyms').onDelete('CASCADE') // null = platform default
      table.string('key', 100).notNullable()             // membership_expiry_reminder, payment_success, etc.
      table.string('title', 150).notNullable()
      table.text('body').notNullable()                   // supports {{member_name}}, {{expiry_date}} variables
      table.jsonb('data').defaultTo('{}')
      table.boolean('is_active').defaultTo(true)
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
      table.unique(['gym_id', 'key'])
    })

    this.schema.createTable('notifications', (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('gen_random_uuid()').knexQuery)
      table.uuid('gym_id').nullable().references('id').inTable('gyms').onDelete('CASCADE')
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
      table
        .enum('type', [
          'membership_expiry',
          'payment_success',
          'payment_failed',
          'workout_reminder',
          'diet_reminder',
          'pt_booking',
          'announcement',
          'offer',
          'challenge',
          'attendance',
          'system',
        ])
        .notNullable()
      table.string('title', 150).notNullable()
      table.text('body').notNullable()
      table.jsonb('data').defaultTo('{}')               // deep link data, entity refs
      table.boolean('is_read').defaultTo(false)
      table.boolean('is_push_sent').defaultTo(false)
      table.timestamp('read_at').nullable()
      table.timestamp('created_at').notNullable()
    })

    this.schema.createTable('announcements', (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('gen_random_uuid()').knexQuery)
      table.uuid('gym_id').notNullable().references('id').inTable('gyms').onDelete('CASCADE')
      table.uuid('created_by').notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.string('title', 150).notNullable()
      table.text('body').notNullable()
      table.string('image_url', 500).nullable()
      table.string('cta_text', 50).nullable()
      table.string('cta_url', 255).nullable()
      table.boolean('send_push').defaultTo(true)
      table.enum('target_audience', ['all', 'active', 'expired', 'trainers']).defaultTo('all')
      table.timestamp('scheduled_at').nullable()         // null = send immediately
      table.boolean('is_sent').defaultTo(false)
      table.timestamp('sent_at').nullable()
      table.timestamp('deleted_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })

    this.schema.raw('CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at DESC)')
    this.schema.raw('CREATE INDEX idx_device_tokens_user ON device_tokens(user_id, is_active)')
    this.schema.raw('CREATE INDEX idx_announcements_gym ON announcements(gym_id, created_at DESC) WHERE deleted_at IS NULL')
  }

  async down() {
    this.schema.dropTable('announcements')
    this.schema.dropTable('notifications')
    this.schema.dropTable('notification_templates')
    this.schema.dropTable('device_tokens')
  }
}
