import db from '@adonisjs/lucid/services/db'
import emitter from '@adonisjs/core/services/emitter'
import { DateTime } from 'luxon'
import AttendanceRecord from '#models/attendance_record.model'
import GymMember from '#models/gym_member.model'
import QrCode from '#models/qr_code.model'
import { verifyQrToken } from '#helpers/qr.helper'

interface QrCheckInInput {
  gymId: string
  qrToken: string
  userId: string
}

interface ManualCheckInInput {
  gymId: string
  gymMemberId: string
  branchId: string
  markedBy: string
  notes?: string
}

export class AttendanceService {
  async qrCheckIn(input: QrCheckInInput): Promise<AttendanceRecord> {
    const decoded = verifyQrToken(input.qrToken)

    const qrCode = await QrCode.query()
      .where('token', input.qrToken)
      .where('gym_id', input.gymId)
      .where('is_active', true)
      .first()

    if (!qrCode) throw new Error('QR_CODE_INVALID')

    if (qrCode.expiresAt && (qrCode.expiresAt as any) < DateTime.now()) {
      throw new Error('QR_CODE_EXPIRED')
    }

    const member = await GymMember.query()
      .where('gym_id', input.gymId)
      .whereHas('user', (q) => q.where('id', input.userId))
      .whereNull('deleted_at')
      .first()

    if (!member) throw new Error('MEMBER_NOT_FOUND')
    if (member.status !== 'active') throw new Error('MEMBERSHIP_INACTIVE')

    return this.markCheckIn({
      gymId: input.gymId,
      gymMemberId: member.id,
      branchId: qrCode.branchId,
      checkInMode: 'qr_scan',
    })
  }

  async manualCheckIn(input: ManualCheckInInput): Promise<AttendanceRecord> {
    const member = await GymMember.query()
      .where('id', input.gymMemberId)
      .where('gym_id', input.gymId)
      .whereNull('deleted_at')
      .firstOrFail()

    if (member.status !== 'active') throw new Error('MEMBERSHIP_INACTIVE')

    return this.markCheckIn({
      gymId: input.gymId,
      gymMemberId: member.id,
      branchId: input.branchId,
      checkInMode: 'manual',
      markedBy: input.markedBy,
      notes: input.notes,
    })
  }

  async getTodayAttendance(gymId: string, branchId?: string) {
    const today = DateTime.now().toSQLDate()!

    const query = db
      .from('attendance_records as ar')
      .join('gym_members as gm', 'gm.id', 'ar.gym_member_id')
      .join('users as u', 'u.id', 'gm.user_id')
      .where('ar.gym_id', gymId)
      .where('ar.check_in_date', today)
      .where('ar.is_valid', true)

    if (branchId) query.where('ar.branch_id', branchId)

    return query
      .select('ar.id', 'ar.checked_in_at', 'ar.check_in_mode', 'ar.gym_member_id', 'u.full_name', 'gm.member_code')
      .orderBy('ar.checked_in_at', 'desc')
  }

  private async markCheckIn(params: {
    gymId: string
    gymMemberId: string
    branchId: string
    checkInMode: AttendanceRecord['checkInMode']
    markedBy?: string
    notes?: string
  }): Promise<AttendanceRecord> {
    const today = DateTime.now().toSQLDate()!

    const existing = await AttendanceRecord.query()
      .where('gym_member_id', params.gymMemberId)
      .where('branch_id', params.branchId)
      .where('check_in_date', today)
      .first()

    if (existing) return existing

    const record = await AttendanceRecord.create({
      gymId: params.gymId,
      gymMemberId: params.gymMemberId,
      branchId: params.branchId,
      checkInDate: today as any,
      checkedInAt: DateTime.now() as any,
      checkInMode: params.checkInMode,
      markedBy: params.markedBy ?? null,
      notes: params.notes ?? null,
      isValid: true,
    })

    emitter.emit('attendance:marked', { record })
    return record
  }

  async getMonthlyReport(gymId: string, year: number, month: number) {
    const startDate = DateTime.fromObject({ year, month, day: 1 }).toSQLDate()!
    const endDate = DateTime.fromObject({ year, month }).endOf('month').toSQLDate()!

    return db
      .from('attendance_records as ar')
      .join('gym_members as gm', 'gm.id', 'ar.gym_member_id')
      .join('users as u', 'u.id', 'gm.user_id')
      .where('ar.gym_id', gymId)
      .whereBetween('ar.check_in_date', [startDate, endDate])
      .where('ar.is_valid', true)
      .select(
        'ar.gym_member_id',
        'u.full_name',
        'gm.member_code',
        db.raw('COUNT(ar.id) as total_days'),
        db.raw('MAX(ar.checked_in_at) as last_check_in')
      )
      .groupBy('ar.gym_member_id', 'u.full_name', 'gm.member_code')
      .orderBy('total_days', 'desc')
  }
}
