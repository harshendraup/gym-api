import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'business_admins'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('gen_random_uuid()').knexQuery)
      table.uuid('business_id').notNullable().references('id').inTable('businesses').onDelete('CASCADE')

      table.string('name', 150).notNullable()
      table.string('email', 255).notNullable()
      table.string('phone', 20).nullable()
      table.string('password_hash', 255).notNullable()
      table.string('role', 50).notNullable().defaultTo('admin')

      table.boolean('is_active').notNullable().defaultTo(true)

      table.timestamp('deleted_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.unique(['email', 'business_id'])
    })

    this.schema.raw('CREATE INDEX idx_business_admins_business_id ON business_admins(business_id)')
    this.schema.raw('CREATE INDEX idx_business_admins_email ON business_admins(email)')
    this.schema.raw('CREATE INDEX idx_business_admins_active ON business_admins(is_active) WHERE deleted_at IS NULL')
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
