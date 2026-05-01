import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class AuditLog extends BaseModel {
  static table = 'audit_logs'

  @column({ isPrimary: true }) declare id: string
  @column() declare gymId: string | null
  @column() declare actorId: string | null
  @column() declare actorRole: string | null
  @column() declare action: string
  @column() declare entityType: string | null
  @column() declare entityId: string | null
  @column() declare before: Record<string, unknown>
  @column() declare after: Record<string, unknown>
  @column() declare ipAddress: string | null
  @column() declare userAgent: string | null
  @column.dateTime({ autoCreate: true }) declare createdAt: DateTime
}
