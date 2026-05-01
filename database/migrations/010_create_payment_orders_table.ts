import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'payment_orders'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('gen_random_uuid()').knexQuery)
      table.uuid('gym_id').notNullable().references('id').inTable('gyms').onDelete('CASCADE')
      table.uuid('gym_member_id').notNullable().references('id').inTable('gym_members').onDelete('CASCADE')
      table.uuid('subscription_id').nullable().references('id').inTable('member_subscriptions').onDelete('SET NULL')

      // Razorpay order
      table.string('razorpay_order_id', 100).nullable().unique()
      table.string('idempotency_key', 64).notNullable().unique()

      table.integer('amount').notNullable()               // in paise
      table.integer('amount_paid').defaultTo(0)           // for partial payments
      table.integer('amount_due').notNullable()
      table.string('currency', 5).defaultTo('INR')

      table
        .enum('status', ['created', 'attempted', 'paid', 'failed', 'refunded', 'partially_paid'])
        .defaultTo('created')

      table
        .enum('order_type', ['membership', 'pt_session', 'supplement', 'locker', 'other'])
        .defaultTo('membership')

      table.string('description', 255).nullable()
      table.jsonb('notes').defaultTo('{}')
      table.timestamp('expires_at').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })

    this.schema.raw('CREATE INDEX idx_orders_gym ON payment_orders(gym_id, status, created_at DESC)')
    this.schema.raw('CREATE INDEX idx_orders_member ON payment_orders(gym_member_id, status)')
    this.schema.raw('CREATE INDEX idx_orders_razorpay ON payment_orders(razorpay_order_id) WHERE razorpay_order_id IS NOT NULL')
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
