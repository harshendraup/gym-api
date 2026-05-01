import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Gym from './gym.model.js'

export default class GymBranch extends BaseModel {
  static table = 'gym_branches'

  @column({ isPrimary: true }) declare id: string
  @column() declare gymId: string
  @column() declare name: string
  @column() declare code: string
  @column() declare phone: string | null
  @column() declare email: string | null
  @column() declare addressLine1: string | null
  @column() declare city: string | null
  @column() declare state: string | null
  @column() declare pincode: string | null
  @column() declare latitude: number | null
  @column() declare longitude: number | null
  @column() declare timings: Record<string, { open: string; close: string }>
  @column() declare isMainBranch: boolean
  @column() declare isActive: boolean
  @column.dateTime() declare deletedAt: DateTime | null
  @column.dateTime({ autoCreate: true }) declare createdAt: DateTime
  @column.dateTime({ autoCreate: true, autoUpdate: true }) declare updatedAt: DateTime

  @belongsTo(() => Gym)
  declare gym: BelongsTo<typeof Gym>
}
