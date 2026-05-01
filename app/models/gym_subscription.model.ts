import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Gym from './gym.model.js'

export type GymSubscriptionStatus = 'trial' | 'active' | 'past_due' | 'cancelled' | 'expired'

export default class GymSubscription extends BaseModel {
  static table = 'gym_subscriptions'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare gymId: string

  @column()
  declare saasPlanId: string

  @column()
  declare billingCycle: 'monthly' | 'yearly'

  @column()
  declare status: GymSubscriptionStatus

  @column.dateTime()
  declare trialEndsAt: DateTime | null

  @column.dateTime()
  declare currentPeriodStart: DateTime

  @column.dateTime()
  declare currentPeriodEnd: DateTime

  @column.dateTime()
  declare cancelledAt: DateTime | null

  @column()
  declare razorpaySubscriptionId: string | null

  @column()
  declare amountPaid: number | null

  @column.dateTime()
  declare lastPaymentAt: DateTime | null

  @column()
  declare failedPaymentCount: number

  @column()
  declare metadata: Record<string, unknown>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Gym)
  declare gym: BelongsTo<typeof Gym>

  get isActive(): boolean {
    return this.status === 'active' || this.status === 'trial'
  }

  get isExpired(): boolean {
    return this.currentPeriodEnd < DateTime.now()
  }
}
