import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class DeviceToken extends BaseModel {
  static table = 'device_tokens'

  @column({ isPrimary: true }) declare id: string
  @column() declare userId: string
  @column() declare token: string
  @column() declare platform: 'ios' | 'android' | 'web'
  @column() declare deviceId: string | null
  @column() declare isActive: boolean
  @column.dateTime() declare lastUsedAt: DateTime | null
  @column.dateTime({ autoCreate: true }) declare createdAt: DateTime
}
