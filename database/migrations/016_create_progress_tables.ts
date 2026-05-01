import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('body_measurements', (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('gen_random_uuid()').knexQuery)
      table.uuid('gym_id').notNullable().references('id').inTable('gyms').onDelete('CASCADE')
      table.uuid('gym_member_id').notNullable().references('id').inTable('gym_members').onDelete('CASCADE')
      table.uuid('recorded_by').nullable().references('id').inTable('users').onDelete('SET NULL')
      table.date('measured_at').notNullable()
      table.decimal('weight_kg', 5, 2).nullable()
      table.decimal('height_cm', 5, 2).nullable()
      table.decimal('bmi', 4, 2).nullable()
      table.decimal('body_fat_percent', 4, 2).nullable()
      table.decimal('muscle_mass_kg', 5, 2).nullable()
      table.decimal('chest_cm', 5, 2).nullable()
      table.decimal('waist_cm', 5, 2).nullable()
      table.decimal('hips_cm', 5, 2).nullable()
      table.decimal('left_arm_cm', 5, 2).nullable()
      table.decimal('right_arm_cm', 5, 2).nullable()
      table.decimal('left_thigh_cm', 5, 2).nullable()
      table.decimal('right_thigh_cm', 5, 2).nullable()
      table.text('notes').nullable()
      table.timestamp('created_at').notNullable()
    })

    this.schema.createTable('progress_photos', (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('gen_random_uuid()').knexQuery)
      table.uuid('gym_id').notNullable().references('id').inTable('gyms').onDelete('CASCADE')
      table.uuid('gym_member_id').notNullable().references('id').inTable('gym_members').onDelete('CASCADE')
      table.date('photo_date').notNullable()
      table.string('photo_url', 500).notNullable()
      table.string('thumbnail_url', 500).nullable()
      table.enum('angle', ['front', 'back', 'left', 'right']).notNullable()
      table.text('notes').nullable()
      table.timestamp('created_at').notNullable()
    })

    this.schema.createTable('pt_packages', (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('gen_random_uuid()').knexQuery)
      table.uuid('gym_id').notNullable().references('id').inTable('gyms').onDelete('CASCADE')
      table.uuid('trainer_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.string('name', 100).notNullable()
      table.integer('sessions_count').notNullable()
      table.integer('price').notNullable()               // in paise
      table.integer('session_duration_minutes').defaultTo(60)
      table.text('description').nullable()
      table.boolean('is_active').defaultTo(true)
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })

    this.schema.createTable('pt_bookings', (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('gen_random_uuid()').knexQuery)
      table.uuid('gym_id').notNullable().references('id').inTable('gyms').onDelete('CASCADE')
      table.uuid('gym_member_id').notNullable().references('id').inTable('gym_members').onDelete('CASCADE')
      table.uuid('trainer_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.uuid('pt_package_id').nullable().references('id').inTable('pt_packages').onDelete('SET NULL')
      table.uuid('payment_order_id').nullable().references('id').inTable('payment_orders').onDelete('SET NULL')
      table.datetime('scheduled_at').notNullable()
      table.integer('duration_minutes').defaultTo(60)
      table.enum('status', ['scheduled', 'completed', 'cancelled', 'no_show']).defaultTo('scheduled')
      table.integer('sessions_remaining').defaultTo(0)
      table.text('notes').nullable()
      table.integer('member_rating').nullable()          // 1-5
      table.text('member_feedback').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })

    this.schema.raw('CREATE INDEX idx_measurements_member ON body_measurements(gym_member_id, measured_at DESC)')
    this.schema.raw('CREATE INDEX idx_photos_member ON progress_photos(gym_member_id, photo_date DESC)')
    this.schema.raw('CREATE INDEX idx_pt_bookings_gym ON pt_bookings(gym_id, scheduled_at DESC)')
    this.schema.raw('CREATE INDEX idx_pt_bookings_trainer ON pt_bookings(trainer_id, scheduled_at DESC)')
  }

  async down() {
    this.schema.dropTable('pt_bookings')
    this.schema.dropTable('pt_packages')
    this.schema.dropTable('progress_photos')
    this.schema.dropTable('body_measurements')
  }
}
