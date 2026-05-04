import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from './user.model.js'

export default class Business extends BaseModel {
  static table = 'businesses'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare createdBy: string

  @column()
  declare name: string

  @column()
  declare slug: string

  @column()
  declare businessKey: string

  @column()
  declare legalName: string | null

  @column()
  declare registrationNumber: string | null

  @column()
  declare type: 'independent' | 'chain' | 'franchise'

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
  declare logoUrl: string | null

  @column()
  declare status: 'active' | 'suspended' | 'pending'

  @column()
  declare metadata: Record<string, unknown>

  @column.dateTime()
  declare deletedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => User, { foreignKey: 'createdBy' })
  declare creator: BelongsTo<typeof User>
}
