import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'gyms'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('gen_random_uuid()').knexQuery)
      table.uuid('owner_id').notNullable().references('id').inTable('users').onDelete('RESTRICT')

      // Identity
      table.string('name', 150).notNullable()
      table.string('slug', 150).notNullable().unique()
      table.string('gym_code', 10).notNullable().unique()  // Member onboarding code
      table.string('tagline', 255).nullable()
      table.text('description').nullable()

      // Contact
      table.string('email', 255).nullable()
      table.string('phone', 15).nullable()
      table.string('website', 255).nullable()

      // Address
      table.string('address_line1', 255).nullable()
      table.string('address_line2', 255).nullable()
      table.string('city', 100).nullable()
      table.string('state', 100).nullable()
      table.string('pincode', 10).nullable()
      table.string('country', 50).defaultTo('India')
      table.decimal('latitude', 10, 8).nullable()
      table.decimal('longitude', 11, 8).nullable()

      // Branding (white-label)
      table.string('logo_url', 500).nullable()
      table.string('banner_url', 500).nullable()
      table.string('primary_color', 7).defaultTo('#6366F1')
      table.string('secondary_color', 7).defaultTo('#8B5CF6')
      table.string('accent_color', 7).defaultTo('#F59E0B')
      table.jsonb('app_branding').defaultTo('{}')         // splash, fonts, etc.

      // Facilities
      table.jsonb('facilities').defaultTo('[]')           // ['Parking', 'Locker', 'Sauna', ...]
      table.jsonb('timings').defaultTo('{}')              // { mon: { open: '06:00', close: '22:00' } }

      // Settings
      table.jsonb('settings').defaultTo('{}')             // grace_period, attendance_mode, etc.

      // Status
      table.enum('status', ['active', 'suspended', 'trial', 'expired']).defaultTo('trial')
      table.boolean('is_verified').defaultTo(false)
      table.timestamp('verified_at').nullable()
      table.timestamp('deleted_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })

    this.schema.raw('CREATE INDEX idx_gyms_owner ON gyms(owner_id)')
    this.schema.raw('CREATE INDEX idx_gyms_status ON gyms(status)')
    this.schema.raw('CREATE INDEX idx_gyms_deleted ON gyms(deleted_at) WHERE deleted_at IS NULL')
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
