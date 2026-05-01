import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import GymMember from './gym_member.model.js'
import GymBranch from './gym_branch.model.js'

export default class AttendanceRecord extends BaseModel {
  static table = 'attendance_records'

  @column({ isPrimary: true }) declare id: string
  @column() declare gymId: string
  @column() declare gymMemberId: string
  @column() declare branchId: string
  @column.date() declare checkInDate: DateTime
  @column.dateTime() declare checkedInAt: DateTime
  @column.dateTime() declare checkedOutAt: DateTime | null
  @column() declare checkInMode: 'qr_scan' | 'manual' | 'biometric' | 'mobile_app'
  @column() declare markedBy: string | null
  @column() declare isValid: boolean
  @column() declare notes: string | null
  @column.dateTime({ autoCreate: true }) declare createdAt: DateTime

  @belongsTo(() => GymMember) declare gymMember: BelongsTo<typeof GymMember>
  @belongsTo(() => GymBranch) declare branch: BelongsTo<typeof GymBranch>
}
