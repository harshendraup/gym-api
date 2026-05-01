import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import GymMember from './gym_member.model.js'
import MembershipPlan from './membership_plan.model.js'

export type SubscriptionStatus =
  | 'pending_payment'
  | 'active'
  | 'expired'
  | 'frozen'
  | 'cancelled'
  | 'grace_period'

export default class MemberSubscription extends BaseModel {
  static table = 'member_subscriptions'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare gymId: string

  @column()
  declare gymMemberId: string

  @column()
  declare membershipPlanId: string

  @column()
  declare previousSubscriptionId: string | null

  @column()
  declare status: SubscriptionStatus

  @column.date()
  declare startsAt: DateTime

  @column.date()
  declare expiresAt: DateTime

  @column.date()
  declare graceExpiresAt: DateTime | null

  @column()
  declare freezeDaysUsed: number

  @column.date()
  declare frozenAt: DateTime | null

  @column.date()
  declare freezeExpiresAt: DateTime | null

  @column()
  declare amountPaid: number

  @column()
  declare discountApplied: number

  @column()
  declare ptSessionsTotal: number

  @column()
  declare ptSessionsUsed: number

  @column()
  declare paymentMode: 'online' | 'cash' | 'upi' | 'card' | 'cheque' | 'partial'

  @column()
  declare notes: string | null

  @column()
  declare createdBy: string | null

  @column()
  declare metadata: Record<string, unknown>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => GymMember)
  declare gymMember: BelongsTo<typeof GymMember>

  @belongsTo(() => MembershipPlan)
  declare membershipPlan: BelongsTo<typeof MembershipPlan>

  get isActive(): boolean {
    return this.status === 'active' || this.status === 'grace_period'
  }

  get daysRemaining(): number {
    if (!this.expiresAt) return 0
    const diff = this.expiresAt.diffNow('days').days
    return Math.max(0, Math.ceil(diff))
  }

  get isExpired(): boolean {
    return this.expiresAt < DateTime.now()
  }

  get ptSessionsRemaining(): number {
    return Math.max(0, this.ptSessionsTotal - this.ptSessionsUsed)
  }
}
