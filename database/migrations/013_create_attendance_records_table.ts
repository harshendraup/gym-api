import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'attendance_records'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('gen_random_uuid()').knexQuery)
      table.uuid('gym_id').notNullable().references('id').inTable('gyms').onDelete('CASCADE')
      table.uuid('gym_member_id').notNullable().references('id').inTable('gym_members').onDelete('CASCADE')
      table.uuid('branch_id').notNullable().references('id').inTable('gym_branches').onDelete('CASCADE')

      table.date('check_in_date').notNullable()
      table.timestamp('checked_in_at').notNullable()
      table.timestamp('checked_out_at').nullable()

      table
        .enum('check_in_mode', ['qr_scan', 'manual', 'biometric', 'mobile_app'])
        .defaultTo('qr_scan')

      table.uuid('marked_by').nullable().references('id').inTable('users').onDelete('SET NULL')
      table.boolean('is_valid').defaultTo(true)
      table.text('notes').nullable()

      table.timestamp('created_at').notNullable()

      // One check-in per member per day per branch
      table.unique(['gym_member_id', 'branch_id', 'check_in_date'])
    })

    this.schema.raw('CREATE INDEX idx_attendance_gym_date ON attendance_records(gym_id, check_in_date DESC)')
    this.schema.raw('CREATE INDEX idx_attendance_member ON attendance_records(gym_member_id, check_in_date DESC)')
    this.schema.raw('CREATE INDEX idx_attendance_branch_date ON attendance_records(branch_id, check_in_date DESC)')
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
