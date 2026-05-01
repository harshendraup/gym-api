import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('gen_random_uuid()').knexQuery)
      table.string('phone', 15).nullable().unique()
      table.string('email', 255).nullable().unique()
      table.string('password_hash', 255).nullable()
      table.string('full_name', 100).notNullable()
      table.string('profile_photo_url', 500).nullable()
      table.enum('gender', ['male', 'female', 'other']).nullable()
      table.date('date_of_birth').nullable()
      table.boolean('is_phone_verified').defaultTo(false)
      table.boolean('is_email_verified').defaultTo(false)
      table.boolean('is_active').defaultTo(true)
      table.timestamp('last_login_at').nullable()
      table.jsonb('metadata').defaultTo('{}')
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })

    this.schema.raw('CREATE INDEX idx_users_phone ON users(phone) WHERE phone IS NOT NULL')
    this.schema.raw('CREATE INDEX idx_users_email ON users(email) WHERE email IS NOT NULL')
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
