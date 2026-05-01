import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('diet_plans', (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('gen_random_uuid()').knexQuery)
      table.uuid('gym_id').notNullable().references('id').inTable('gyms').onDelete('CASCADE')
      table.uuid('created_by').notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.string('name', 150).notNullable()
      table.text('description').nullable()
      table.integer('daily_calories').nullable()
      table.integer('protein_grams').nullable()
      table.integer('carbs_grams').nullable()
      table.integer('fat_grams').nullable()
      table.enum('diet_type', ['veg', 'non_veg', 'vegan', 'keto', 'paleo', 'balanced']).defaultTo('balanced')
      table.enum('goal', ['weight_loss', 'muscle_gain', 'maintenance', 'endurance']).defaultTo('maintenance')
      table.boolean('is_template').defaultTo(false)
      table.boolean('is_active').defaultTo(true)
      table.timestamp('deleted_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })

    this.schema.createTable('diet_plan_meals', (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('gen_random_uuid()').knexQuery)
      table.uuid('diet_plan_id').notNullable().references('id').inTable('diet_plans').onDelete('CASCADE')
      table.enum('meal_type', ['breakfast', 'mid_morning', 'lunch', 'evening_snack', 'dinner', 'post_workout', 'pre_workout']).notNullable()
      table.string('name', 100).nullable()
      table.text('items').nullable()                    // free-form text description
      table.jsonb('food_items').defaultTo('[]')         // structured: [{name, quantity, unit, calories}]
      table.integer('calories').nullable()
      table.string('time_suggestion', 20).nullable()   // "7:00 AM"
      table.integer('day_number').nullable()            // for weekly plans
      table.timestamp('created_at').notNullable()
    })

    this.schema.createTable('member_diet_assignments', (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('gen_random_uuid()').knexQuery)
      table.uuid('gym_id').notNullable().references('id').inTable('gyms').onDelete('CASCADE')
      table.uuid('gym_member_id').notNullable().references('id').inTable('gym_members').onDelete('CASCADE')
      table.uuid('diet_plan_id').notNullable().references('id').inTable('diet_plans').onDelete('CASCADE')
      table.uuid('assigned_by').notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.date('start_date').notNullable()
      table.date('end_date').nullable()
      table.boolean('is_active').defaultTo(true)
      table.text('notes').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable('member_diet_assignments')
    this.schema.dropTable('diet_plan_meals')
    this.schema.dropTable('diet_plans')
  }
}
