import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'gym_subscriptions'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('gen_random_uuid()').knexQuery)
      table.uuid('gym_id').notNullable().references('id').inTable('gyms').onDelete('CASCADE')
      table.uuid('saas_plan_id').notNullable().references('id').inTable('saas_plans').onDelete('RESTRICT')

      table.enum('billing_cycle', ['monthly', 'yearly']).notNullable()
      table.enum('status', ['trial', 'active', 'past_due', 'cancelled', 'expired']).defaultTo('trial')

      table.timestamp('trial_ends_at').nullable()
      table.timestamp('current_period_start').notNullable()
      table.timestamp('current_period_end').notNullable()
      table.timestamp('cancelled_at').nullable()

      // Payment tracking
      table.string('razorpay_subscription_id', 100).nullable()
      table.integer('amount_paid').nullable()             // last payment in paise
      table.timestamp('last_payment_at').nullable()
      table.integer('failed_payment_count').defaultTo(0)

      table.jsonb('metadata').defaultTo('{}')
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })

    this.schema.raw('CREATE INDEX idx_gym_subs_gym ON gym_subscriptions(gym_id)')
    this.schema.raw('CREATE INDEX idx_gym_subs_status ON gym_subscriptions(status, current_period_end)')
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
