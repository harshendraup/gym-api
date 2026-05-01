import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class PaymentTransaction extends BaseModel {
  static table = 'payment_transactions'

  @column({ isPrimary: true }) declare id: string
  @column() declare gymId: string
  @column() declare paymentOrderId: string
  @column() declare gymMemberId: string
  @column() declare razorpayPaymentId: string | null
  @column() declare razorpaySignature: string | null
  @column() declare amount: number
  @column() declare currency: string
  @column() declare status: 'captured' | 'failed' | 'refunded' | 'pending'
  @column() declare method: 'upi' | 'card' | 'netbanking' | 'wallet' | 'cash' | 'emi' | 'other'
  @column() declare bank: string | null
  @column() declare wallet: string | null
  @column() declare vpa: string | null
  @column() declare errorCode: string | null
  @column() declare errorDescription: string | null
  @column() declare gatewayResponse: Record<string, unknown>
  @column.dateTime() declare capturedAt: DateTime | null
  @column.dateTime({ autoCreate: true }) declare createdAt: DateTime
  // append-only — no updatedAt
}
