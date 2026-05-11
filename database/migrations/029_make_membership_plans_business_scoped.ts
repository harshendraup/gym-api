import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'membership_plans'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.uuid('business_id').nullable().references('id').inTable('businesses').onDelete('CASCADE')
      table.uuid('gym_id').nullable().alter()
    })

    this.schema.raw(`
      UPDATE membership_plans mp
      SET business_id = u.business_id
      FROM gyms g
      JOIN users u ON u.id = g.owner_id
      WHERE mp.gym_id = g.id
        AND mp.business_id IS NULL
    `)

    this.schema.raw('CREATE INDEX idx_membership_plans_business ON membership_plans(business_id, is_active) WHERE deleted_at IS NULL')
  }

  async down() {
    this.schema.raw('DROP INDEX IF EXISTS idx_membership_plans_business')

    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('business_id')
    })
  }
}
