import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'payment_transactions'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('gen_random_uuid()').knexQuery)
      table.uuid('gym_id').notNullable().references('id').inTable('gyms').onDelete('CASCADE')
      table.uuid('payment_order_id').notNullable().references('id').inTable('payment_orders').onDelete('CASCADE')
      table.uuid('gym_member_id').notNullable().references('id').inTable('gym_members').onDelete('CASCADE')

      // Gateway data (append-only — never UPDATE this table)
      table.string('razorpay_payment_id', 100).nullable().unique()
      table.string('razorpay_signature', 255).nullable()

      table.integer('amount').notNullable()
      table.string('currency', 5).defaultTo('INR')
      table
        .enum('status', ['captured', 'failed', 'refunded', 'pending'])
        .notNullable()

      table
        .enum('method', ['upi', 'card', 'netbanking', 'wallet', 'cash', 'emi', 'other'])
        .notNullable()

      table.string('bank', 100).nullable()
      table.string('wallet', 50).nullable()
      table.string('vpa', 100).nullable()               // UPI VPA

      table.string('error_code', 100).nullable()
      table.text('error_description').nullable()

      table.jsonb('gateway_response').defaultTo('{}')   // raw gateway payload
      table.timestamp('captured_at').nullable()

      table.timestamp('created_at').notNullable()
      // NO updated_at — this table is append-only
    })

    this.schema.raw('CREATE INDEX idx_txn_gym ON payment_transactions(gym_id, status, created_at DESC)')
    this.schema.raw('CREATE INDEX idx_txn_order ON payment_transactions(payment_order_id)')
    this.schema.raw('CREATE INDEX idx_txn_rzp ON payment_transactions(razorpay_payment_id) WHERE razorpay_payment_id IS NOT NULL')
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
