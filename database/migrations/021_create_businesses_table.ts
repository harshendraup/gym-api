import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'businesses'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('gen_random_uuid()').knexQuery)
      table.uuid('created_by').notNullable().references('id').inTable('users').onDelete('RESTRICT')

      // Identity
      table.string('name', 150).notNullable()
      table.string('slug', 150).notNullable().unique()
      table.string('legal_name', 255).nullable()
      table.string('registration_number', 100).nullable()
      table.enum('type', ['independent', 'chain', 'franchise']).defaultTo('independent')
      table.text('description').nullable()

      // Contact
      table.string('email', 255).nullable()
      table.string('phone', 15).nullable()
      table.string('website', 255).nullable()

      // Address
      table.string('address_line1', 255).nullable()
      table.string('address_line2', 255).nullable()
      table.string('city', 100).nullable()
      table.string('state', 100).nullable()
      table.string('pincode', 10).nullable()
      table.string('country', 50).defaultTo('India')

      // Branding
      table.string('logo_url', 500).nullable()

      // Status
      table.enum('status', ['active', 'suspended', 'pending']).defaultTo('pending')

      // Flexible metadata
      table.jsonb('metadata').defaultTo('{}')

      table.timestamp('deleted_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })

    this.schema.raw('CREATE INDEX idx_businesses_status ON businesses(status)')
    this.schema.raw('CREATE INDEX idx_businesses_created_by ON businesses(created_by)')
    this.schema.raw(
      'CREATE INDEX idx_businesses_deleted ON businesses(deleted_at) WHERE deleted_at IS NULL'
    )
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
