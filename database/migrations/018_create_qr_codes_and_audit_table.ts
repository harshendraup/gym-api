import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('qr_codes', (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('gen_random_uuid()').knexQuery)
      table.uuid('gym_id').notNullable().references('id').inTable('gyms').onDelete('CASCADE')
      table.uuid('branch_id').notNullable().references('id').inTable('gym_branches').onDelete('CASCADE')
      table.string('token', 64).notNullable().unique()   // signed token embedded in QR
      table.string('qr_image_url', 500).nullable()
      table.boolean('is_active').defaultTo(true)
      table.timestamp('expires_at').nullable()           // null = never expires
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })

    this.schema.createTable('referrals', (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('gen_random_uuid()').knexQuery)
      table.uuid('gym_id').notNullable().references('id').inTable('gyms').onDelete('CASCADE')
      table.uuid('referrer_member_id').notNullable().references('id').inTable('gym_members').onDelete('CASCADE')
      table.uuid('referred_member_id').nullable().references('id').inTable('gym_members').onDelete('SET NULL')
      table.string('referral_code', 20).notNullable().unique()
      table.enum('status', ['pending', 'converted', 'rewarded', 'expired']).defaultTo('pending')
      table.integer('reward_amount').nullable()          // discount or credit in paise
      table.boolean('is_reward_given').defaultTo(false)
      table.timestamp('converted_at').nullable()
      table.timestamp('expires_at').nullable()
      table.timestamp('created_at').notNullable()
    })

    this.schema.createTable('challenges', (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('gen_random_uuid()').knexQuery)
      table.uuid('gym_id').notNullable().references('id').inTable('gyms').onDelete('CASCADE')
      table.uuid('created_by').notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.string('title', 150).notNullable()
      table.text('description').nullable()
      table.string('banner_url', 500).nullable()
      table.enum('type', ['attendance', 'workout', 'weight_loss', 'steps', 'custom']).notNullable()
      table.integer('target_value').nullable()
      table.date('starts_at').notNullable()
      table.date('ends_at').notNullable()
      table.jsonb('reward').defaultTo('{}')              // {type: 'discount', value: 500}
      table.boolean('is_active').defaultTo(true)
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })

    // Central audit log — all mutations logged here
    this.schema.createTable('audit_logs', (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('gen_random_uuid()').knexQuery)
      table.uuid('gym_id').nullable()                    // null for platform-level events
      table.uuid('actor_id').nullable().references('id').inTable('users').onDelete('SET NULL')
      table.string('actor_role', 50).nullable()
      table.string('action', 100).notNullable()          // member.created, payment.captured, etc.
      table.string('entity_type', 100).nullable()        // gym_member, payment_order, etc.
      table.uuid('entity_id').nullable()
      table.jsonb('before').defaultTo('{}')
      table.jsonb('after').defaultTo('{}')
      table.string('ip_address', 45).nullable()
      table.string('user_agent', 255).nullable()
      table.timestamp('created_at').notNullable()
    })

    this.schema.raw('CREATE INDEX idx_qr_codes_branch ON qr_codes(branch_id, is_active)')
    this.schema.raw('CREATE INDEX idx_audit_gym ON audit_logs(gym_id, created_at DESC) WHERE gym_id IS NOT NULL')
    this.schema.raw('CREATE INDEX idx_audit_actor ON audit_logs(actor_id, created_at DESC) WHERE actor_id IS NOT NULL')
    this.schema.raw('CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id)')
  }

  async down() {
    this.schema.dropTable('audit_logs')
    this.schema.dropTable('challenges')
    this.schema.dropTable('referrals')
    this.schema.dropTable('qr_codes')
  }
}
