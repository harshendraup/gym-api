import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'user_gym_roles'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.uuid('gym_id').nullable().alter()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.uuid('gym_id').notNullable().alter()
    })
  }
}
