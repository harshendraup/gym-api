import type { HttpContext } from '@adonisjs/core/http'
import { AttendanceService } from '#services/attendance.service'
import QrCode from '#models/qr_code.model'
import { generateQrToken } from '#helpers/crypto.helper'
import { generateQrImage } from '#helpers/qr.helper'
import vine from '@vinejs/vine'

const manualCheckInValidator = vine.compile(
  vine.object({
    gymMemberId: vine.string().uuid(),
    branchId: vine.string().uuid(),
    notes: vine.string().trim().optional(),
  })
)

const attendanceService = new AttendanceService()

export default class AttendanceController {
  async qrCheckIn({ request, response, gymId, auth }: HttpContext) {
    const { qrToken } = request.only(['qrToken'])
    if (!qrToken) return response.badRequest({ success: false, error: { code: 'MISSING_TOKEN', message: 'qrToken is required' } })

    try {
      const record = await attendanceService.qrCheckIn({
        gymId,
        qrToken,
        userId: auth.getUserOrFail().id,
      })
      return response.ok({ success: true, data: record.serialize() })
    } catch (error: any) {
      const codeMap: Record<string, [number, string]> = {
        QR_CODE_INVALID: [400, 'Invalid QR code'],
        QR_CODE_EXPIRED: [400, 'QR code has expired'],
        MEMBER_NOT_FOUND: [404, 'Member not found'],
        MEMBERSHIP_INACTIVE: [403, 'Your membership is not active'],
      }
      const [status, message] = codeMap[error.message] ?? [500, 'Check-in failed']
      return response.status(status).send({ success: false, error: { code: error.message, message } })
    }
  }

  async manualCheckIn({ request, response, gymId, auth }: HttpContext) {
    const payload = await request.validateUsing(manualCheckInValidator)

    try {
      const record = await attendanceService.manualCheckIn({
        gymId,
        gymMemberId: payload.gymMemberId,
        branchId: payload.branchId,
        markedBy: auth.getUserOrFail().id,
        notes: payload.notes,
      })
      return response.ok({ success: true, data: record.serialize() })
    } catch (error: any) {
      if (error.message === 'MEMBERSHIP_INACTIVE') {
        return response.forbidden({ success: false, error: { code: 'MEMBERSHIP_INACTIVE', message: 'Member\'s membership is not active' } })
      }
      throw error
    }
  }

  async today({ request, response, gymId }: HttpContext) {
    const branchId = request.qs().branchId as string | undefined
    const records = await attendanceService.getTodayAttendance(gymId, branchId)
    return response.ok({ success: true, data: records })
  }

  async monthlyReport({ request, response, gymId }: HttpContext) {
    const { year = new Date().getFullYear(), month = new Date().getMonth() + 1 } = request.qs()
    const report = await attendanceService.getMonthlyReport(gymId, Number(year), Number(month))
    return response.ok({ success: true, data: report })
  }

  async memberHistory({ params, request, response, gymId }: HttpContext) {
    const { month, year } = request.qs()
    const { default: db } = await import('@adonisjs/lucid/services/db')

    let query = db
      .from('attendance_records')
      .where('gym_id', gymId)
      .where('gym_member_id', params.id)
      .orderBy('check_in_date', 'desc')

    if (year) query = query.whereRaw('EXTRACT(YEAR FROM check_in_date) = ?', [year])
    if (month) query = query.whereRaw('EXTRACT(MONTH FROM check_in_date) = ?', [month])

    const records = await query.select('*')
    return response.ok({ success: true, data: records })
  }

  async getBranchQr({ request, response, gymId }: HttpContext) {
    const branchId = request.qs().branchId as string
    if (!branchId) return response.badRequest({ success: false, error: { code: 'MISSING_BRANCH', message: 'branchId is required' } })

    let qrCode = await QrCode.query()
      .where('gym_id', gymId)
      .where('branch_id', branchId)
      .where('is_active', true)
      .first()

    if (!qrCode) {
      const token = generateQrToken({ branchId, gymId, type: 'attendance' })
      const qrImageUrl = await generateQrImage(token)
      qrCode = await QrCode.create({ gymId, branchId, token, qrImageUrl, isActive: true })
    }

    return response.ok({
      success: true,
      data: { token: qrCode.token, qrImageUrl: qrCode.qrImageUrl },
    })
  }
}
