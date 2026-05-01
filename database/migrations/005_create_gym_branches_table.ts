import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'gym_branches'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('gen_random_uuid()').knexQuery)
      table.uuid('gym_id').notNullable().references('id').inTable('gyms').onDelete('CASCADE')

      table.string('name', 150).notNullable()
      table.string('code', 20).notNullable()             // e.g. HQ, NORTH, SOUTH
      table.string('phone', 15).nullable()
      table.string('email', 255).nullable()
      table.string('address_line1', 255).nullable()
      table.string('city', 100).nullable()
      table.string('state', 100).nullable()
      table.string('pincode', 10).nullable()
      table.decimal('latitude', 10, 8).nullable()
      table.decimal('longitude', 11, 8).nullable()
      table.jsonb('timings').defaultTo('{}')
      table.boolean('is_main_branch').defaultTo(false)
      table.boolean('is_active').defaultTo(true)
      table.timestamp('deleted_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.unique(['gym_id', 'code'])
    })

    this.schema.raw('CREATE INDEX idx_branches_gym ON gym_branches(gym_id) WHERE deleted_at IS NULL')
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
