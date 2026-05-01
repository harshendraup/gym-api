import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'gym_members'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('gen_random_uuid()').knexQuery)
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.uuid('gym_id').notNullable().references('id').inTable('gyms').onDelete('CASCADE')
      table.uuid('branch_id').nullable().references('id').inTable('gym_branches').onDelete('SET NULL')
      table.uuid('assigned_trainer_id').nullable().references('id').inTable('users').onDelete('SET NULL')

      table.string('member_code', 20).notNullable()       // GYM-001, GYM-002, ...
      table.enum('status', ['active', 'expired', 'frozen', 'pending', 'cancelled']).defaultTo('pending')

      // Fitness profile
      table.decimal('height_cm', 5, 2).nullable()
      table.decimal('weight_kg', 5, 2).nullable()
      table.enum('fitness_goal', ['weight_loss', 'muscle_gain', 'endurance', 'flexibility', 'general_fitness']).nullable()
      table.text('medical_notes').nullable()
      table.string('emergency_contact_name', 100).nullable()
      table.string('emergency_contact_phone', 15).nullable()

      // Joining
      table.date('joined_at').notNullable()
      table.string('source', 50).nullable()               // walk_in, referral, online, app

      table.jsonb('metadata').defaultTo('{}')
      table.timestamp('deleted_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.unique(['user_id', 'gym_id'])
      table.unique(['gym_id', 'member_code'])
    })

    this.schema.raw('CREATE INDEX idx_members_gym_status ON gym_members(gym_id, status) WHERE deleted_at IS NULL')
    this.schema.raw('CREATE INDEX idx_members_trainer ON gym_members(assigned_trainer_id) WHERE assigned_trainer_id IS NOT NULL')
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
