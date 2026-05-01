import { BaseRepository } from './base.repository.js'
import GymMember from '#models/gym_member.model'
import MemberSubscription from '#models/member_subscription.model'
import { DateTime } from 'luxon'

export class MemberRepository extends BaseRepository<typeof GymMember> {
  protected get model() {
    return GymMember
  }

  async findWithActiveSubscription(memberId: string) {
    return this.query()
      .where('id', memberId)
      .preload('user')
      .preload('activeSubscription', (q) =>
        q.where('status', 'active').preload('membershipPlan')
      )
      .whereNull('deleted_at')
      .firstOrFail()
  }

  async listWithFilters(filters: {
    status?: string
    branchId?: string
    trainerId?: string
    search?: string
    page: number
    perPage: number
  }) {
    const query = this.query()
      .preload('user')
      .preload('activeSubscription', (q) => q.preload('membershipPlan'))
      .whereNull('deleted_at')

    if (filters.status) {
      query.where('status', filters.status)
    }
    if (filters.branchId) {
      query.where('branch_id', filters.branchId)
    }
    if (filters.trainerId) {
      query.where('assigned_trainer_id', filters.trainerId)
    }
    if (filters.search) {
      query.whereHas('user', (userQuery) => {
        userQuery
          .whereILike('full_name', `%${filters.search}%`)
          .orWhereILike('phone', `%${filters.search}%`)
          .orWhereILike('email', `%${filters.search}%`)
      })
    }

    return query.orderBy('created_at', 'desc').paginate(filters.page, filters.perPage)
  }

  async getExpiringMemberships(daysAhead: number) {
    const thresholdDate = DateTime.now().plus({ days: daysAhead }).toSQLDate()!

    return MemberSubscription.query()
      .where('gym_id', this.gymId)
      .where('status', 'active')
      .where('expires_at', '<=', thresholdDate)
      .where('expires_at', '>=', DateTime.now().toSQLDate()!)
      .preload('gymMember', (q) => q.preload('user'))
      .preload('membershipPlan')
  }

  async generateMemberCode(): Promise<string> {
    const lastMember = await this.query()
      .orderBy('created_at', 'desc')
      .first()

    if (!lastMember) return 'MEM-001'

    const lastCode = lastMember.memberCode
    const num = parseInt(lastCode.replace(/\D/g, ''), 10) + 1
    return `MEM-${String(num).padStart(3, '0')}`
  }

  async getAttendanceStats(memberId: string, fromDate: DateTime, toDate: DateTime) {
    const { default: db } = await import('@adonisjs/lucid/services/db')
    return db
      .from('attendance_records')
      .where('gym_id', this.gymId)
      .where('gym_member_id', memberId)
      .whereBetween('check_in_date', [fromDate.toSQLDate()!, toDate.toSQLDate()!])
      .count('* as total')
      .first()
  }
}
