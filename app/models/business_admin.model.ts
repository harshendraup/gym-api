import { DateTime } from 'luxon'
import hash from '@adonisjs/core/services/hash'
import { BaseModel, column, belongsTo, beforeSave } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Business from './business.model.js'

export default class BusinessAdmin extends BaseModel {
  static table = 'business_admins'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare businessId: string

  @column()
  declare name: string

  @column()
  declare email: string

  @column()
  declare phone: string | null

  @column({ serializeAs: null })
  declare passwordHash: string

  @column()
  declare role: string

  @column()
  declare isActive: boolean

  @column.dateTime()
  declare deletedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Business)
  declare business: BelongsTo<typeof Business>

  @beforeSave()
  static async hashPassword(admin: BusinessAdmin) {
    if (admin.$dirty.passwordHash && admin.passwordHash) {
      admin.passwordHash = await hash.make(admin.passwordHash)
    }
  }

  async verifyPassword(plain: string): Promise<boolean> {
    return hash.verify(this.passwordHash, plain)
  }
}
