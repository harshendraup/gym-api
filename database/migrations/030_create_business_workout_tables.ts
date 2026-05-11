import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('business_workout_models', (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('gen_random_uuid()').knexQuery)
      table.uuid('business_id').notNullable().references('id').inTable('businesses').onDelete('CASCADE')
      table.uuid('created_by').notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.string('name', 150).notNullable()
      table.text('description').nullable()
      table.enum('goal', ['fat_loss', 'muscle_gain', 'general_fitness', 'rehab', 'sports']).defaultTo('general_fitness')
      table.enum('difficulty', ['beginner', 'intermediate', 'advanced']).defaultTo('beginner')
      table.integer('duration_weeks').notNullable()
      table.integer('sessions_per_week').notNullable().defaultTo(3)
      table.enum('status', ['draft', 'active', 'archived']).defaultTo('draft')
      table.integer('version').notNullable().defaultTo(1)
      table.boolean('is_active').notNullable().defaultTo(true)
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })

    this.schema.createTable('business_workout_model_days', (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('gen_random_uuid()').knexQuery)
      table.uuid('workout_model_id').notNullable().references('id').inTable('business_workout_models').onDelete('CASCADE')
      table.integer('week_number').notNullable().defaultTo(1)
      table.integer('day_number').notNullable()
      table.string('title', 100).nullable()
      table.boolean('is_rest_day').notNullable().defaultTo(false)
      table.text('notes').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
      table.unique(['workout_model_id', 'week_number', 'day_number'])
    })

    this.schema.createTable('business_workout_model_exercises', (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('gen_random_uuid()').knexQuery)
      table.uuid('workout_day_id').notNullable().references('id').inTable('business_workout_model_days').onDelete('CASCADE')
      table.integer('sort_order').notNullable().defaultTo(0)
      table.string('exercise_name', 150).notNullable()
      table.integer('sets').nullable()
      table.string('reps', 30).nullable()
      table.string('load_type', 20).nullable()
      table.string('tempo', 20).nullable()
      table.integer('rest_seconds').nullable()
      table.text('notes').nullable()
      table.timestamp('created_at').notNullable()
    })

    this.schema.createTable('business_workout_assignments', (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('gen_random_uuid()').knexQuery)
      table.uuid('business_id').notNullable().references('id').inTable('businesses').onDelete('CASCADE')
      table.uuid('member_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.uuid('workout_model_id').notNullable().references('id').inTable('business_workout_models').onDelete('CASCADE')
      table.uuid('assigned_by').notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.date('start_date').notNullable()
      table.date('end_date').nullable()
      table.enum('status', ['scheduled', 'active', 'paused', 'completed', 'cancelled']).defaultTo('scheduled')
      table.text('coach_note').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })

    this.schema.createTable('business_workout_session_logs', (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('gen_random_uuid()').knexQuery)
      table.uuid('business_id').notNullable().references('id').inTable('businesses').onDelete('CASCADE')
      table.uuid('assignment_id').notNullable().references('id').inTable('business_workout_assignments').onDelete('CASCADE')
      table.uuid('member_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.date('session_date').notNullable()
      table.integer('duration_minutes').nullable()
      table.jsonb('exercise_logs').notNullable().defaultTo('[]')
      table.text('notes').nullable()
      table.timestamp('created_at').notNullable()
    })

    this.schema.createTable('business_exercise_library', (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('gen_random_uuid()').knexQuery)
      table.uuid('business_id').notNullable().references('id').inTable('businesses').onDelete('CASCADE')
      table.string('name', 150).notNullable()
      table.string('muscle_group', 80).nullable()
      table.string('equipment', 80).nullable()
      table.text('instructions').nullable()
      table.string('media_url', 500).nullable()
      table.text('contraindications').nullable()
      table.boolean('is_active').notNullable().defaultTo(true)
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })

    this.schema.raw('CREATE INDEX idx_bwm_business_status ON business_workout_models(business_id, status, is_active)')
    this.schema.raw('CREATE INDEX idx_bwa_business_member_status ON business_workout_assignments(business_id, member_id, status)')
    this.schema.raw('CREATE INDEX idx_bwsl_assignment_date ON business_workout_session_logs(assignment_id, session_date DESC)')
  }

  async down() {
    this.schema.dropTable('business_exercise_library')
    this.schema.dropTable('business_workout_session_logs')
    this.schema.dropTable('business_workout_assignments')
    this.schema.dropTable('business_workout_model_exercises')
    this.schema.dropTable('business_workout_model_days')
    this.schema.dropTable('business_workout_models')
  }
}
