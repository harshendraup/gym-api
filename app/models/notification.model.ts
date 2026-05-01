import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export type NotificationType =
  | 'membership_expiry'
  | 'payment_success'
  | 'payment_failed'
  | 'workout_reminder'
  | 'diet_reminder'
  | 'pt_booking'
  | 'announcement'
  | 'offer'
  | 'challenge'
  | 'attendance'
  | 'system'

export default class Notification extends BaseModel {
  static table = 'notifications'

  @column({ isPrimary: true }) declare id: string
  @column() declare gymId: string | null
  @column() declare userId: string
  @column() declare type: NotificationType
  @column() declare title: string
  @column() declare body: string
  @column() declare data: Record<string, unknown>
  @column() declare isRead: boolean
  @column() declare isPushSent: boolean
  @column.dateTime() declare readAt: DateTime | null
  @column.dateTime({ autoCreate: true }) declare createdAt: DateTime
}
