import { DateTime } from 'luxon'
import hash from '@adonisjs/core/services/hash'
import { BaseModel, column, beforeSave, hasMany, belongsTo } from '@adonisjs/lucid/orm'
import type { HasMany, BelongsTo } from '@adonisjs/lucid/types/relations'
import { DbAccessTokensProvider } from '@adonisjs/auth/access_tokens'
import GymMember from './gym_member.model.js'
import DeviceToken from './device_token.model.js'
import Business from './business.model.js'

export default class User extends BaseModel {
  static accessTokens = DbAccessTokensProvider.forModel(User, {
    expiresIn: '7d',
    prefix: 'gymos_',
  })
  static table = 'users'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare gymId: string | null

  @column()
  declare businessId: string | null

  @column()
  declare role: 'super_admin' | 'admin' | 'manager' | 'trainer' | 'member' | 'gym_owner'

  @column()
  declare phone: string | null

  @column()
  declare email: string | null

  @column({ serializeAs: null })
  declare passwordHash: string | null

  @column()
  declare fullName: string

  @column()
  declare profilePhotoUrl: string | null

  @column()
  declare gender: 'male' | 'female' | 'other' | null

  @column.date()
  declare dateOfBirth: DateTime | null

  @column()
  declare isPhoneVerified: boolean

  @column()
  declare isEmailVerified: boolean

  @column()
  declare isActive: boolean

  @column.dateTime()
  declare lastLoginAt: DateTime | null

  @column()
  declare metadata: Record<string, unknown>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Business)
  declare business: BelongsTo<typeof Business>

  @hasMany(() => GymMember)
  declare gymMemberships: HasMany<typeof GymMember>

  @hasMany(() => DeviceToken)
  declare deviceTokens: HasMany<typeof DeviceToken>

  @beforeSave()
  static async hashPassword(user: User) {
    if (user.$dirty.passwordHash && user.passwordHash) {
      user.passwordHash = await hash.make(user.passwordHash)
    }
  }

  async verifyPassword(plainPassword: string): Promise<boolean> {
    if (!this.passwordHash) return false
    return hash.verify(this.passwordHash, plainPassword)
  }

  get age(): number | null {
    if (!this.dateOfBirth) return null
    return Math.floor(DateTime.now().diff(this.dateOfBirth, 'years').years)
  }
}
