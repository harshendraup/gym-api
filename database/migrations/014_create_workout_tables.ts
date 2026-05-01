import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    // Exercise library (global + per-gym custom)
    this.schema.createTable('exercises', (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('gen_random_uuid()').knexQuery)
      table.uuid('gym_id').nullable().references('id').inTable('gyms').onDelete('CASCADE') // null = global
      table.string('name', 150).notNullable()
      table.text('description').nullable()
      table.enum('category', ['chest', 'back', 'shoulders', 'arms', 'legs', 'core', 'cardio', 'full_body', 'flexibility']).notNullable()
      table.enum('equipment', ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'resistance_band', 'kettlebell', 'other']).notNullable()
      table.enum('difficulty', ['beginner', 'intermediate', 'advanced']).defaultTo('beginner')
      table.string('video_url', 500).nullable()
      table.string('thumbnail_url', 500).nullable()
      table.string('muscles_targeted', 255).nullable()
      table.boolean('is_active').defaultTo(true)
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })

    // Workout plans
    this.schema.createTable('workout_plans', (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('gen_random_uuid()').knexQuery)
      table.uuid('gym_id').notNullable().references('id').inTable('gyms').onDelete('CASCADE')
      table.uuid('created_by').notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.string('name', 150).notNullable()
      table.text('description').nullable()
      table.integer('duration_weeks').notNullable()
      table.enum('goal', ['weight_loss', 'muscle_gain', 'endurance', 'strength', 'flexibility', 'general']).defaultTo('general')
      table.enum('difficulty', ['beginner', 'intermediate', 'advanced']).defaultTo('beginner')
      table.boolean('is_template').defaultTo(false)     // reusable template vs assigned plan
      table.boolean('is_active').defaultTo(true)
      table.timestamp('deleted_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })

    // Workout days within a plan
    this.schema.createTable('workout_days', (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('gen_random_uuid()').knexQuery)
      table.uuid('workout_plan_id').notNullable().references('id').inTable('workout_plans').onDelete('CASCADE')
      table.integer('day_number').notNullable()          // 1-7
      table.string('name', 100).nullable()               // e.g. "Push Day", "Leg Day"
      table.boolean('is_rest_day').defaultTo(false)
      table.text('notes').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.unique(['workout_plan_id', 'day_number'])
    })

    // Exercises within a day
    this.schema.createTable('workout_day_exercises', (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('gen_random_uuid()').knexQuery)
      table.uuid('workout_day_id').notNullable().references('id').inTable('workout_days').onDelete('CASCADE')
      table.uuid('exercise_id').notNullable().references('id').inTable('exercises').onDelete('CASCADE')
      table.integer('sort_order').defaultTo(0)
      table.integer('sets').nullable()
      table.string('reps', 20).nullable()               // "12" or "8-12" or "to failure"
      table.string('duration_seconds', 20).nullable()   // for timed exercises
      table.string('rest_seconds', 20).nullable()
      table.decimal('weight_kg', 5, 2).nullable()
      table.text('notes').nullable()
      table.timestamp('created_at').notNullable()
    })

    // Assignments — plan assigned to member
    this.schema.createTable('member_workout_assignments', (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('gen_random_uuid()').knexQuery)
      table.uuid('gym_id').notNullable().references('id').inTable('gyms').onDelete('CASCADE')
      table.uuid('gym_member_id').notNullable().references('id').inTable('gym_members').onDelete('CASCADE')
      table.uuid('workout_plan_id').notNullable().references('id').inTable('workout_plans').onDelete('CASCADE')
      table.uuid('assigned_by').notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.date('start_date').notNullable()
      table.date('end_date').nullable()
      table.boolean('is_active').defaultTo(true)
      table.text('notes').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })

    // Member workout logs
    this.schema.createTable('workout_logs', (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('gen_random_uuid()').knexQuery)
      table.uuid('gym_id').notNullable().references('id').inTable('gyms').onDelete('CASCADE')
      table.uuid('gym_member_id').notNullable().references('id').inTable('gym_members').onDelete('CASCADE')
      table.uuid('workout_day_id').notNullable().references('id').inTable('workout_days').onDelete('CASCADE')
      table.date('logged_date').notNullable()
      table.integer('duration_minutes').nullable()
      table.jsonb('exercises_completed').defaultTo('[]') // [{exercise_id, sets_done, reps_done, weight_used}]
      table.integer('calories_burned').nullable()
      table.integer('mood_rating').nullable()            // 1-5
      table.text('notes').nullable()
      table.timestamp('created_at').notNullable()
    })

    this.schema.raw('CREATE INDEX idx_exercises_category ON exercises(category, equipment)')
    this.schema.raw('CREATE INDEX idx_workout_plans_gym ON workout_plans(gym_id, is_active) WHERE deleted_at IS NULL')
    this.schema.raw('CREATE INDEX idx_assignments_member ON member_workout_assignments(gym_member_id, is_active)')
    this.schema.raw('CREATE INDEX idx_workout_logs_member ON workout_logs(gym_member_id, logged_date DESC)')
  }

  async down() {
    this.schema.dropTable('workout_logs')
    this.schema.dropTable('member_workout_assignments')
    this.schema.dropTable('workout_day_exercises')
    this.schema.dropTable('workout_days')
    this.schema.dropTable('workout_plans')
    this.schema.dropTable('exercises')
  }
}
