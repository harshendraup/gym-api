import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany, hasOne } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany, HasOne } from '@adonisjs/lucid/types/relations'
import User from './user.model.js'
import GymBranch from './gym_branch.model.js'
import GymSubscription from './gym_subscription.model.js'
import MembershipPlan from './membership_plan.model.js'

export default class Gym extends BaseModel {
  static table = 'gyms'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare ownerId: string

  @column()
  declare name: string

  @column()
  declare slug: string

  @column()
  declare gymCode: string

  @column()
  declare tagline: string | null

  @column()
  declare description: string | null

  @column()
  declare email: string | null

  @column()
  declare phone: string | null

  @column()
  declare website: string | null

  @column()
  declare addressLine1: string | null

  @column()
  declare addressLine2: string | null

  @column()
  declare city: string | null

  @column()
  declare state: string | null

  @column()
  declare pincode: string | null

  @column()
  declare country: string

  @column()
  declare latitude: number | null

  @column()
  declare longitude: number | null

  @column()
  declare logoUrl: string | null

  @column()
  declare bannerUrl: string | null

  @column()
  declare primaryColor: string

  @column()
  declare secondaryColor: string

  @column()
  declare accentColor: string

  @column()
  declare appBranding: Record<string, unknown>

  @column()
  declare facilities: string[]

  @column()
  declare timings: Record<string, { open: string; close: string }>

  @column()
  declare settings: Record<string, unknown>

  @column()
  declare status: 'active' | 'suspended' | 'trial' | 'expired'

  @column()
  declare isVerified: boolean

  @column.dateTime()
  declare verifiedAt: DateTime | null

  @column.dateTime()
  declare deletedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => User, { foreignKey: 'ownerId' })
  declare owner: BelongsTo<typeof User>

  @hasMany(() => GymBranch)
  declare branches: HasMany<typeof GymBranch>

  @hasOne(() => GymSubscription)
  declare activeSubscription: HasOne<typeof GymSubscription>

  @hasMany(() => MembershipPlan)
  declare membershipPlans: HasMany<typeof MembershipPlan>

  get brandingConfig() {
    return {
      name: this.name,
      logoUrl: this.logoUrl,
      bannerUrl: this.bannerUrl,
      primaryColor: this.primaryColor,
      secondaryColor: this.secondaryColor,
      accentColor: this.accentColor,
      ...this.appBranding,
    }
  }
}
