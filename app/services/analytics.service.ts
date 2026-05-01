import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

export class AnalyticsService {
  async getDashboardSummary(gymId: string) {
    const now = DateTime.now()
    const monthStart = now.startOf('month').toSQLDate()!
    const monthEnd = now.endOf('month').toSQLDate()!
    const todayDate = now.toSQLDate()!
    const last30Days = now.minus({ days: 30 }).toSQLDate()!

    const [
      memberStats,
      revenueStats,
      attendanceToday,
      expiringThisWeek,
      newMembersThisMonth,
    ] = await Promise.all([
      this.getMemberStats(gymId),
      this.getRevenueStats(gymId, monthStart, monthEnd),
      this.getTodayAttendance(gymId, todayDate),
      this.getExpiringCount(gymId, now.plus({ days: 7 }).toSQLDate()!),
      this.getNewMembersCount(gymId, monthStart, monthEnd),
    ])

    return {
      members: memberStats,
      revenue: revenueStats,
      attendanceToday,
      expiringThisWeek,
      newMembersThisMonth,
    }
  }

  private async getMemberStats(gymId: string) {
    const result = await db
      .from('gym_members')
      .where('gym_id', gymId)
      .whereNull('deleted_at')
      .select(
        db.raw(`COUNT(*) FILTER (WHERE status = 'active') as active`),
        db.raw(`COUNT(*) FILTER (WHERE status = 'expired') as expired`),
        db.raw(`COUNT(*) FILTER (WHERE status = 'frozen') as frozen`),
        db.raw(`COUNT(*) as total`)
      )
      .first()

    return {
      active: Number(result?.active ?? 0),
      expired: Number(result?.expired ?? 0),
      frozen: Number(result?.frozen ?? 0),
      total: Number(result?.total ?? 0),
    }
  }

  private async getRevenueStats(gymId: string, fromDate: string, toDate: string) {
    const result = await db
      .from('payment_transactions')
      .where('gym_id', gymId)
      .where('status', 'captured')
      .whereBetween('created_at', [fromDate, toDate])
      .select(
        db.raw('COALESCE(SUM(amount), 0) as total'),
        db.raw('COUNT(*) as transaction_count')
      )
      .first()

    return {
      totalPaise: Number(result?.total ?? 0),
      totalRupees: Number(result?.total ?? 0) / 100,
      transactionCount: Number(result?.transaction_count ?? 0),
    }
  }

  private async getTodayAttendance(gymId: string, date: string) {
    const result = await db
      .from('attendance_records')
      .where('gym_id', gymId)
      .where('check_in_date', date)
      .where('is_valid', true)
      .count('* as total')
      .first()

    return Number(result?.total ?? 0)
  }

  private async getExpiringCount(gymId: string, byDate: string) {
    const result = await db
      .from('member_subscriptions')
      .where('gym_id', gymId)
      .where('status', 'active')
      .where('expires_at', '<=', byDate)
      .count('* as total')
      .first()

    return Number(result?.total ?? 0)
  }

  private async getNewMembersCount(gymId: string, fromDate: string, toDate: string) {
    const result = await db
      .from('gym_members')
      .where('gym_id', gymId)
      .whereNull('deleted_at')
      .whereBetween('joined_at', [fromDate, toDate])
      .count('* as total')
      .first()

    return Number(result?.total ?? 0)
  }

  async getRevenueChart(gymId: string, months: number = 12) {
    const fromDate = DateTime.now().minus({ months }).startOf('month').toSQLDate()!

    return db
      .from('payment_transactions')
      .where('gym_id', gymId)
      .where('status', 'captured')
      .where('created_at', '>=', fromDate)
      .select(
        db.raw(`TO_CHAR(created_at, 'YYYY-MM') as month`),
        db.raw('COALESCE(SUM(amount), 0) as revenue'),
        db.raw('COUNT(*) as count')
      )
      .groupByRaw(`TO_CHAR(created_at, 'YYYY-MM')`)
      .orderByRaw(`TO_CHAR(created_at, 'YYYY-MM') ASC`)
  }

  async getMemberGrowthChart(gymId: string, months: number = 12) {
    const fromDate = DateTime.now().minus({ months }).startOf('month').toSQLDate()!

    return db
      .from('gym_members')
      .where('gym_id', gymId)
      .whereNull('deleted_at')
      .where('joined_at', '>=', fromDate)
      .select(
        db.raw(`TO_CHAR(joined_at, 'YYYY-MM') as month`),
        db.raw('COUNT(*) as new_members')
      )
      .groupByRaw(`TO_CHAR(joined_at, 'YYYY-MM')`)
      .orderByRaw(`TO_CHAR(joined_at, 'YYYY-MM') ASC`)
  }

  async getAttendanceHeatmap(gymId: string, year: number, month: number) {
    const startDate = DateTime.fromObject({ year, month, day: 1 }).toSQLDate()!
    const endDate = DateTime.fromObject({ year, month }).endOf('month').toSQLDate()!

    return db
      .from('attendance_records')
      .where('gym_id', gymId)
      .where('is_valid', true)
      .whereBetween('check_in_date', [startDate, endDate])
      .select(
        'check_in_date',
        db.raw('COUNT(*) as count')
      )
      .groupBy('check_in_date')
      .orderBy('check_in_date', 'asc')
  }
}
