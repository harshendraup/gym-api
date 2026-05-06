import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    // 1. Wipe all data (CASCADE clears all FK-dependent tables)
    await this.db.rawQuery('TRUNCATE TABLE users CASCADE')

    // 2. Drop old role/admin tables
    this.schema.dropTableIfExists('business_admins')
    this.schema.dropTableIfExists('user_gym_roles')

    // 3. Add role + business_id to users
    this.schema.alterTable('users', (table) => {
      table
        .uuid('business_id')
        .nullable()
        .references('id')
        .inTable('businesses')
        .onDelete('SET NULL')

      table
        .string('role', 50)
        .notNullable()
        .defaultTo('member')
    })

    this.schema.raw('CREATE INDEX idx_users_role ON users(role)')
    this.schema.raw('CREATE INDEX idx_users_business_id ON users(business_id) WHERE business_id IS NOT NULL')
  }

  async down() {
    this.schema.alterTable('users', (table) => {
      table.dropColumn('business_id')
      table.dropColumn('role')
    })
  }
}
