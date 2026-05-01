import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class Invoice extends BaseModel {
  static table = 'invoices'

  @column({ isPrimary: true }) declare id: string
  @column() declare gymId: string
  @column() declare gymMemberId: string
  @column() declare paymentOrderId: string
  @column() declare invoiceNumber: string
  @column() declare subtotal: number
  @column() declare discount: number
  @column() declare tax: number
  @column() declare total: number
  @column() declare currency: string
  @column() declare lineItems: Array<{ name: string; qty: number; rate: number; discount?: number; amount: number }>
  @column() declare gymSnapshot: Record<string, unknown>
  @column() declare memberSnapshot: Record<string, unknown>
  @column() declare pdfUrl: string | null
  @column() declare status: 'draft' | 'sent' | 'paid' | 'void'
  @column.date() declare dueDate: DateTime | null
  @column.dateTime({ autoCreate: true }) declare createdAt: DateTime
}
