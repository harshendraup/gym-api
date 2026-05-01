import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany, hasOne } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany, HasOne } from '@adonisjs/lucid/types/relations'
import User from './user.model.js'
import Gym from './gym.model.js'
import GymBranch from './gym_branch.model.js'
import MemberSubscription from './member_subscription.model.js'

export default class GymMember extends BaseModel {
  static table = 'gym_members'

  @column({ isPrimary: true }) declare id: string
  @column() declare userId: string
  @column() declare gymId: string
  @column() declare branchId: string | null
  @column() declare assignedTrainerId: string | null
  @column() declare memberCode: string
  @column() declare status: 'active' | 'expired' | 'frozen' | 'pending' | 'cancelled'
  @column() declare heightCm: number | null
  @column() declare weightKg: number | null
  @column() declare fitnessGoal: string | null
  @column() declare medicalNotes: string | null
  @column() declare emergencyContactName: string | null
  @column() declare emergencyContactPhone: string | null
  @column.date() declare joinedAt: DateTime
  @column() declare source: string | null
  @column() declare metadata: Record<string, unknown>
  @column.dateTime() declare deletedAt: DateTime | null
  @column.dateTime({ autoCreate: true }) declare createdAt: DateTime
  @column.dateTime({ autoCreate: true, autoUpdate: true }) declare updatedAt: DateTime

  @belongsTo(() => User) declare user: BelongsTo<typeof User>
  @belongsTo(() => Gym) declare gym: BelongsTo<typeof Gym>
  @belongsTo(() => GymBranch) declare branch: BelongsTo<typeof GymBranch>

  @hasOne(() => MemberSubscription, {
    onQuery: (q) => q.whereIn('status', ['active', 'grace_period']).orderBy('created_at', 'desc'),
  })
  declare activeSubscription: HasOne<typeof MemberSubscription>

  @hasMany(() => MemberSubscription)
  declare subscriptions: HasMany<typeof MemberSubscription>
}
