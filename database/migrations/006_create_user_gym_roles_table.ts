import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'user_gym_roles'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('gen_random_uuid()').knexQuery)
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.uuid('gym_id').notNullable().references('id').inTable('gyms').onDelete('CASCADE')
      table.uuid('branch_id').nullable().references('id').inTable('gym_branches').onDelete('SET NULL')

      table
        .enum('role', ['gym_owner', 'trainer', 'staff', 'member', 'super_admin'])
        .notNullable()

      table.boolean('is_active').defaultTo(true)
      table.jsonb('permissions').defaultTo('[]')         // extra granular permissions
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.unique(['user_id', 'gym_id', 'role'])
    })

    this.schema.raw('CREATE INDEX idx_ugr_user ON user_gym_roles(user_id)')
    this.schema.raw('CREATE INDEX idx_ugr_gym_role ON user_gym_roles(gym_id, role)')
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
