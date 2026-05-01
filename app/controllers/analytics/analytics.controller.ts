import type { HttpContext } from '@adonisjs/core/http'
import { AnalyticsService } from '#services/analytics.service'

const analyticsService = new AnalyticsService()

export default class AnalyticsController {
  async dashboard({ response, gymId }: HttpContext) {
    const data = await analyticsService.getDashboardSummary(gymId)
    return response.ok({ success: true, data })
  }

  async revenue({ request, response, gymId }: HttpContext) {
    const months = Number(request.qs().months ?? 12)
    const data = await analyticsService.getRevenueChart(gymId, months)
    return response.ok({ success: true, data })
  }

  async memberGrowth({ request, response, gymId }: HttpContext) {
    const months = Number(request.qs().months ?? 12)
    const data = await analyticsService.getMemberGrowthChart(gymId, months)
    return response.ok({ success: true, data })
  }

  async attendance({ request, response, gymId }: HttpContext) {
    const now = new Date()
    const year = Number(request.qs().year ?? now.getFullYear())
    const month = Number(request.qs().month ?? now.getMonth() + 1)
    const data = await analyticsService.getAttendanceHeatmap(gymId, year, month)
    return response.ok({ success: true, data })
  }
}
