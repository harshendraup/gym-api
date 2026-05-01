import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import GymMember from './gym_member.model.js'
import PaymentTransaction from './payment_transaction.model.js'

export default class PaymentOrder extends BaseModel {
  static table = 'payment_orders'

  @column({ isPrimary: true }) declare id: string
  @column() declare gymId: string
  @column() declare gymMemberId: string
  @column() declare subscriptionId: string | null
  @column() declare razorpayOrderId: string | null
  @column() declare idempotencyKey: string
  @column() declare amount: number
  @column() declare amountPaid: number
  @column() declare amountDue: number
  @column() declare currency: string
  @column() declare status: 'created' | 'attempted' | 'paid' | 'failed' | 'refunded' | 'partially_paid'
  @column() declare orderType: 'membership' | 'pt_session' | 'supplement' | 'locker' | 'other'
  @column() declare description: string | null
  @column() declare notes: Record<string, unknown>
  @column.dateTime() declare expiresAt: DateTime | null
  @column.dateTime({ autoCreate: true }) declare createdAt: DateTime
  @column.dateTime({ autoCreate: true, autoUpdate: true }) declare updatedAt: DateTime

  @belongsTo(() => GymMember) declare gymMember: BelongsTo<typeof GymMember>
  @hasMany(() => PaymentTransaction) declare transactions: HasMany<typeof PaymentTransaction>
}
