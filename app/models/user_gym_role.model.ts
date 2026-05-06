import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from './user.model.js'
import Gym from './gym.model.js'
import GymBranch from './gym_branch.model.js'

export default class UserGymRole extends BaseModel {
  static table = 'user_gym_roles'

  @column({ isPrimary: true }) declare id: string
  @column() declare userId: string
  @column() declare gymId: string
  @column() declare branchId: string | null
  @column() declare role: 'gym_owner' | 'trainer' | 'staff' | 'member' | 'super_admin'
  @column() declare isActive: boolean
  @column() declare permissions: string[]
  @column.dateTime({ autoCreate: true }) declare createdAt: DateTime
  @column.dateTime({ autoCreate: true, autoUpdate: true }) declare updatedAt: DateTime

  @belongsTo(() => User) declare user: BelongsTo<typeof User>
  @belongsTo(() => Gym) declare gym: BelongsTo<typeof Gym>
  @belongsTo(() => GymBranch) declare branch: BelongsTo<typeof GymBranch>
}
