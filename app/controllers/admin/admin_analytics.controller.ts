import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

export default class AdminAnalyticsController {
  async platform({ response }: HttpContext) {
    const [gymStats, userStats, revenueStats] = await Promise.all([
      db.from('gyms')
        .whereNull('deleted_at')
        .select(
          db.raw(`COUNT(*) as total`),
          db.raw(`COUNT(*) FILTER (WHERE status = 'active') as active`),
          db.raw(`COUNT(*) FILTER (WHERE status = 'trial') as trial`),
          db.raw(`COUNT(*) FILTER (WHERE status = 'suspended') as suspended`)
        )
        .first(),

      db.from('users').count('* as total').first(),

      db.from('payment_transactions')
        .where('status', 'captured')
        .whereRaw(`created_at >= DATE_TRUNC('month', NOW())`)
        .select(
          db.raw('COALESCE(SUM(amount), 0) as monthly_revenue'),
          db.raw('COUNT(*) as transaction_count')
        )
        .first(),
    ])

    return response.ok({
      success: true,
      data: {
        gyms: {
          total: Number(gymStats?.total ?? 0),
          active: Number(gymStats?.active ?? 0),
          trial: Number(gymStats?.trial ?? 0),
          suspended: Number(gymStats?.suspended ?? 0),
        },
        totalUsers: Number(userStats?.total ?? 0),
        monthlyRevenue: Number(revenueStats?.monthly_revenue ?? 0),
        monthlyTransactions: Number(revenueStats?.transaction_count ?? 0),
      },
    })
  }

  async revenue({ request, response }: HttpContext) {
    const months = Number(request.qs().months ?? 12)
    const fromDate = DateTime.now().minus({ months }).startOf('month').toSQLDate()!

    const data = await db
      .from('payment_transactions')
      .where('status', 'captured')
      .where('created_at', '>=', fromDate)
      .select(
        db.raw(`TO_CHAR(created_at, 'YYYY-MM') as month`),
        db.raw('COALESCE(SUM(amount), 0) as revenue'),
        db.raw('COUNT(DISTINCT gym_id) as active_gyms'),
        db.raw('COUNT(*) as transactions')
      )
      .groupByRaw(`TO_CHAR(created_at, 'YYYY-MM')`)
      .orderByRaw(`TO_CHAR(created_at, 'YYYY-MM') ASC`)

    return response.ok({ success: true, data })
  }
}
