import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Gym from './gym.model.js'

export default class MembershipPlan extends BaseModel {
  static table = 'membership_plans'

  @column({ isPrimary: true }) declare id: string
  @column() declare gymId: string | null
  @column() declare businessId: string | null
  @column() declare name: string
  @column() declare description: string | null
  @column() declare durationDays: number
  @column() declare price: number
  @column() declare currency: string
  @column() declare billingCycle: 'monthly' | 'quarterly' | 'yearly'
  @column() declare enrollmentFee: number
  @column() declare trialDays: number
  @column() declare taxEnabled: boolean
  @column() declare taxRate: number | null
  @column() declare taxInclusive: boolean
  @column() declare visibility: 'public' | 'private'
  @column() declare discountPrice: number | null
  @column() declare isOfferActive: boolean
  @column.dateTime() declare offerExpiresAt: DateTime | null
  @column() declare planType: 'standard' | 'premium' | 'student' | 'couple' | 'corporate'
  @column() declare includesPt: boolean
  @column() declare ptSessionsCount: number
  @column() declare includesDiet: boolean
  @column() declare includesLocker: boolean
  @column() declare includesSupplements: boolean
  @column() declare inclusions: string[]
  @column() declare maxFreezeDays: number
  @column() declare isActive: boolean
  @column() declare sortOrder: number
  @column.dateTime() declare deletedAt: DateTime | null
  @column.dateTime({ autoCreate: true }) declare createdAt: DateTime
  @column.dateTime({ autoCreate: true, autoUpdate: true }) declare updatedAt: DateTime

  @belongsTo(() => Gym) declare gym: BelongsTo<typeof Gym>

  get effectivePrice(): number {
    return this.isOfferActive && this.discountPrice ? this.discountPrice : this.price
  }
}
