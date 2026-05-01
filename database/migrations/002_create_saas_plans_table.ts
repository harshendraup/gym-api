import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'saas_plans'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('gen_random_uuid()').knexQuery)
      table.string('name', 50).notNullable()           // Basic, Pro, Enterprise
      table.string('slug', 50).notNullable().unique()
      table.integer('price_monthly').notNullable()      // in paise (INR)
      table.integer('price_yearly').notNullable()
      table.integer('max_members').notNullable()        // -1 = unlimited
      table.integer('max_branches').notNullable()
      table.integer('max_trainers').notNullable()
      table.boolean('has_white_label').defaultTo(false)
      table.boolean('has_analytics').defaultTo(false)
      table.boolean('has_pt_management').defaultTo(false)
      table.boolean('has_diet_management').defaultTo(false)
      table.boolean('has_api_access').defaultTo(false)
      table.integer('storage_gb').notNullable().defaultTo(5)
      table.jsonb('features').defaultTo('[]')           // additional feature flags
      table.boolean('is_active').defaultTo(true)
      table.integer('sort_order').defaultTo(0)
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
