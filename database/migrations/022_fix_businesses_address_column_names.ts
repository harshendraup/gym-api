import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'businesses'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.renameColumn('address_line1', 'address_line_1')
      table.renameColumn('address_line2', 'address_line_2')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.renameColumn('address_line_1', 'address_line1')
      table.renameColumn('address_line_2', 'address_line2')
    })
  }
}
