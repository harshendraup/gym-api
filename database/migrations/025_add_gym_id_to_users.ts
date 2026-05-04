import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // Tracks which gym the user first registered with (their primary gym)
      table.uuid('gym_id').nullable().references('id').inTable('gyms').onDelete('SET NULL')
    })

    this.schema.raw('CREATE INDEX idx_users_gym_id ON users(gym_id) WHERE gym_id IS NOT NULL')
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('gym_id')
    })
  }
}
