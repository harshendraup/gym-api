import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'businesses'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('business_key', 100).nullable().unique()
    })

    // Back-fill existing rows: use slug as the default business_key
    this.defer(async (db) => {
      await db.rawQuery(`
        UPDATE businesses
        SET business_key = slug
        WHERE business_key IS NULL
      `)
    })

    // Make non-nullable after back-fill
    this.schema.alterTable(this.tableName, (table) => {
      table.string('business_key', 100).notNullable().alter()
    })

    this.schema.raw(
      'CREATE INDEX idx_businesses_business_key ON businesses(business_key)'
    )
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('business_key')
    })
  }
}
