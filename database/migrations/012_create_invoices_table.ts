import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'invoices'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('gen_random_uuid()').knexQuery)
      table.uuid('gym_id').notNullable().references('id').inTable('gyms').onDelete('CASCADE')
      table.uuid('gym_member_id').notNullable().references('id').inTable('gym_members').onDelete('CASCADE')
      table.uuid('payment_order_id').notNullable().references('id').inTable('payment_orders').onDelete('CASCADE')

      table.string('invoice_number', 30).notNullable().unique() // INV-GYM001-20240101-001
      table.integer('subtotal').notNullable()
      table.integer('discount').defaultTo(0)
      table.integer('tax').defaultTo(0)
      table.integer('total').notNullable()
      table.string('currency', 5).defaultTo('INR')

      table.jsonb('line_items').notNullable()              // [{name, qty, rate, amount}]
      table.jsonb('gym_snapshot').notNullable()            // gym name+address at invoice time
      table.jsonb('member_snapshot').notNullable()         // member name+contact at invoice time

      table.string('pdf_url', 500).nullable()
      table.enum('status', ['draft', 'sent', 'paid', 'void']).defaultTo('paid')
      table.date('due_date').nullable()

      table.timestamp('created_at').notNullable()
      // append-only — no updated_at
    })

    this.schema.raw('CREATE INDEX idx_invoices_gym ON invoices(gym_id, created_at DESC)')
    this.schema.raw('CREATE INDEX idx_invoices_member ON invoices(gym_member_id, created_at DESC)')
    this.schema.raw('CREATE INDEX idx_invoices_number ON invoices(invoice_number)')
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
