import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'member_subscriptions'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('gen_random_uuid()').knexQuery)
      table.uuid('gym_id').notNullable().references('id').inTable('gyms').onDelete('CASCADE')
      table.uuid('gym_member_id').notNullable().references('id').inTable('gym_members').onDelete('CASCADE')
      table.uuid('membership_plan_id').notNullable().references('id').inTable('membership_plans').onDelete('RESTRICT')
      table.uuid('previous_subscription_id').nullable().references('id').inTable('member_subscriptions').onDelete('SET NULL')

      table
        .enum('status', ['pending_payment', 'active', 'expired', 'frozen', 'cancelled', 'grace_period'])
        .defaultTo('pending_payment')

      table.date('starts_at').notNullable()
      table.date('expires_at').notNullable()
      table.date('grace_expires_at').nullable()           // expiry + grace period days

      // Freeze tracking
      table.integer('freeze_days_used').defaultTo(0)
      table.date('frozen_at').nullable()
      table.date('freeze_expires_at').nullable()

      // Pricing snapshot (price at time of purchase, not current plan price)
      table.integer('amount_paid').notNullable()          // in paise
      table.integer('discount_applied').defaultTo(0)

      // PT sessions
      table.integer('pt_sessions_total').defaultTo(0)
      table.integer('pt_sessions_used').defaultTo(0)

      table.enum('payment_mode', ['online', 'cash', 'upi', 'card', 'cheque', 'partial']).notNullable()
      table.text('notes').nullable()
      table.uuid('created_by').nullable().references('id').inTable('users').onDelete('SET NULL')

      table.jsonb('metadata').defaultTo('{}')
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })

    this.schema.raw('CREATE INDEX idx_subs_gym_member ON member_subscriptions(gym_id, gym_member_id)')
    this.schema.raw('CREATE INDEX idx_subs_expiry ON member_subscriptions(gym_id, expires_at, status)')
    this.schema.raw('CREATE INDEX idx_subs_active ON member_subscriptions(gym_member_id, status) WHERE status = \'active\'')
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
