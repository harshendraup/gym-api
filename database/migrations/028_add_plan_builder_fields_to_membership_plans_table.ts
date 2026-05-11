import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'membership_plans'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('currency', 3).notNullable().defaultTo('INR')
      table.enum('billing_cycle', ['monthly', 'quarterly', 'yearly']).notNullable().defaultTo('monthly')
      table.integer('enrollment_fee').notNullable().defaultTo(0)
      table.integer('trial_days').notNullable().defaultTo(0)
      table.boolean('tax_enabled').notNullable().defaultTo(false)
      table.decimal('tax_rate', 5, 2).nullable()
      table.boolean('tax_inclusive').notNullable().defaultTo(false)
      table.enum('visibility', ['public', 'private']).notNullable().defaultTo('public')
    })

    this.schema.raw('CREATE INDEX idx_membership_plans_visibility ON membership_plans(gym_id, visibility, is_active) WHERE deleted_at IS NULL')
  }

  async down() {
    this.schema.raw('DROP INDEX IF EXISTS idx_membership_plans_visibility')

    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('currency')
      table.dropColumn('billing_cycle')
      table.dropColumn('enrollment_fee')
      table.dropColumn('trial_days')
      table.dropColumn('tax_enabled')
      table.dropColumn('tax_rate')
      table.dropColumn('tax_inclusive')
      table.dropColumn('visibility')
    })
  }
}
