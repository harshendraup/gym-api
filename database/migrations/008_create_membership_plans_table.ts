import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'membership_plans'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('gen_random_uuid()').knexQuery)
      table.uuid('gym_id').notNullable().references('id').inTable('gyms').onDelete('CASCADE')

      table.string('name', 100).notNullable()            // Monthly, Quarterly, Annual, etc.
      table.text('description').nullable()
      table.integer('duration_days').notNullable()        // 30, 90, 180, 365
      table.integer('price').notNullable()                // in paise
      table.integer('discount_price').nullable()          // for offers
      table.boolean('is_offer_active').defaultTo(false)
      table.timestamp('offer_expires_at').nullable()

      table.enum('plan_type', ['standard', 'premium', 'student', 'couple', 'corporate']).defaultTo('standard')

      // Inclusions
      table.boolean('includes_pt').defaultTo(false)
      table.integer('pt_sessions_count').defaultTo(0)
      table.boolean('includes_diet').defaultTo(false)
      table.boolean('includes_locker').defaultTo(false)
      table.boolean('includes_supplements').defaultTo(false)
      table.jsonb('inclusions').defaultTo('[]')           // custom inclusions list

      // Freeze allowance
      table.integer('max_freeze_days').defaultTo(0)

      table.boolean('is_active').defaultTo(true)
      table.integer('sort_order').defaultTo(0)
      table.timestamp('deleted_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })

    this.schema.raw('CREATE INDEX idx_plans_gym ON membership_plans(gym_id, is_active) WHERE deleted_at IS NULL')
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
