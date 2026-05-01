import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import GymBranch from './gym_branch.model.js'

export default class QrCode extends BaseModel {
  static table = 'qr_codes'

  @column({ isPrimary: true }) declare id: string
  @column() declare gymId: string
  @column() declare branchId: string
  @column() declare token: string
  @column() declare qrImageUrl: string | null
  @column() declare isActive: boolean
  @column.dateTime() declare expiresAt: DateTime | null
  @column.dateTime({ autoCreate: true }) declare createdAt: DateTime
  @column.dateTime({ autoCreate: true, autoUpdate: true }) declare updatedAt: DateTime

  @belongsTo(() => GymBranch) declare branch: BelongsTo<typeof GymBranch>
}
