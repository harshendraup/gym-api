import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import emitter from '@adonisjs/core/services/emitter'
import User from '#models/user.model'
import GymMember from '#models/gym_member.model'
import UserGymRole from '#models/user_gym_role.model'
import { MemberRepository } from '#repositories/member.repository'
import { generateGymCode } from '#helpers/crypto.helper'

interface CreateMemberInput {
  gymId: string
  branchId?: string
  assignedTrainerId?: string
  fullName: string
  phone?: string
  email?: string
  gender?: string
  dateOfBirth?: Date | string
  profilePhotoUrl?: string
  heightCm?: number
  weightKg?: number
  fitnessGoal?: string
  medicalNotes?: string
  emergencyContactName?: string
  emergencyContactPhone?: string
  source?: string
  createdBy?: string  // optional — null when member self-registers
}

interface UpdateMemberInput {
  fullName?: string
  profilePhotoUrl?: string
  branchId?: string
  assignedTrainerId?: string
  heightCm?: number
  weightKg?: number
  fitnessGoal?: string
  medicalNotes?: string
  emergencyContactName?: string
  emergencyContactPhone?: string
}

export class MemberService {
  async createMember(input: CreateMemberInput): Promise<GymMember> {
    return db.transaction(async (trx) => {
      // Find or create the user by phone or email
      let user = await User.query({ client: trx })
        .where((q) => {
          if (input.phone) q.orWhere('phone', input.phone)
          if (input.email) q.orWhere('email', input.email)
        })
        .first()

      if (!user) {
        user = await User.create(
          {
            fullName: input.fullName,
            phone: input.phone ?? null,
            email: input.email ?? null,
            gender: input.gender as any ?? null,
            dateOfBirth: input.dateOfBirth
              ? DateTime.fromJSDate(input.dateOfBirth as unknown as Date)
              : null,
            profilePhotoUrl: input.profilePhotoUrl ?? null,
            gymId: input.gymId,
            isActive: true,
          },
          { client: trx }
        )
      } else if (!user.gymId) {
        // Existing user registering at a gym for the first time — stamp their primary gym
        user.gymId = input.gymId
        await user.save()
      }

      // Check if already a member of this gym
      const existing = await GymMember.query({ client: trx })
        .where('user_id', user.id)
        .where('gym_id', input.gymId)
        .whereNull('deleted_at')
        .first()

      if (existing) {
        throw new Error('MEMBER_ALREADY_EXISTS')
      }

      const repo = new MemberRepository(input.gymId)
      const memberCode = await repo.generateMemberCode()

      const member = await GymMember.create(
        {
          userId: user.id,
          gymId: input.gymId,
          branchId: input.branchId ?? null,
          assignedTrainerId: input.assignedTrainerId ?? null,
          memberCode,
          status: 'pending',
          heightCm: input.heightCm ?? null,
          weightKg: input.weightKg ?? null,
          fitnessGoal: input.fitnessGoal ?? null,
          medicalNotes: input.medicalNotes ?? null,
          emergencyContactName: input.emergencyContactName ?? null,
          emergencyContactPhone: input.emergencyContactPhone ?? null,
          joinedAt: DateTime.now(),
          source: input.source ?? null,
        },
        { client: trx }
      )

      // Assign member role
      await UserGymRole.create(
        {
          userId: user.id,
          gymId: input.gymId,
          role: 'member',
          isActive: true,
        },
        { client: trx }
      )

      emitter.emit('member:registered', { member, user })

      return member
    })
  }

  async updateMember(memberId: string, gymId: string, input: UpdateMemberInput): Promise<GymMember> {
    const member = await GymMember.query()
      .where('id', memberId)
      .where('gym_id', gymId)
      .whereNull('deleted_at')
      .firstOrFail()

    if (input.fullName || input.profilePhotoUrl) {
      await User.query()
        .where('id', member.userId)
        .update({
          ...(input.fullName && { fullName: input.fullName }),
          ...(input.profilePhotoUrl !== undefined && { profilePhotoUrl: input.profilePhotoUrl }),
        })
    }

    member.merge({
      branchId: input.branchId ?? member.branchId,
      assignedTrainerId: input.assignedTrainerId ?? member.assignedTrainerId,
      heightCm: input.heightCm ?? member.heightCm,
      weightKg: input.weightKg ?? member.weightKg,
      fitnessGoal: input.fitnessGoal ?? member.fitnessGoal,
      medicalNotes: input.medicalNotes ?? member.medicalNotes,
      emergencyContactName: input.emergencyContactName ?? member.emergencyContactName,
      emergencyContactPhone: input.emergencyContactPhone ?? member.emergencyContactPhone,
    })

    await member.save()
    await member.load('user')

    return member
  }

  async deleteMember(memberId: string, gymId: string, deletedBy: string): Promise<void> {
    const member = await GymMember.query()
      .where('id', memberId)
      .where('gym_id', gymId)
      .whereNull('deleted_at')
      .firstOrFail()

    member.deletedAt = DateTime.now()
    await member.save()

    // Deactivate their gym role
    await UserGymRole.query()
      .where('user_id', member.userId)
      .where('gym_id', gymId)
      .where('role', 'member')
      .update({ isActive: false })

    emitter.emit('audit:log', {
      gymId,
      actorId: deletedBy,
      action: 'member.deleted',
      entityType: 'gym_member',
      entityId: memberId,
    })
  }

  async getMemberStats(memberId: string, gymId: string) {
    const [attendance, workouts, ptStats] = await Promise.all([
      db
        .from('attendance_records')
        .where('gym_id', gymId)
        .where('gym_member_id', memberId)
        .where('is_valid', true)
        .select(
          db.raw('COUNT(*) as total_attendance'),
          db.raw(`COUNT(*) FILTER (WHERE check_in_date >= DATE_TRUNC('month', NOW())) as this_month`)
        )
        .first(),

      db
        .from('workout_logs')
        .where('gym_id', gymId)
        .where('gym_member_id', memberId)
        .count('* as total')
        .first(),

      db
        .from('member_subscriptions')
        .where('gym_id', gymId)
        .where('gym_member_id', memberId)
        .whereIn('status', ['active', 'grace_period'])
        .select('pt_sessions_total', 'pt_sessions_used')
        .orderBy('created_at', 'desc')
        .first(),
    ])

    // Calculate attendance streak
    const recentAttendance = await db
      .from('attendance_records')
      .where('gym_id', gymId)
      .where('gym_member_id', memberId)
      .where('is_valid', true)
      .orderBy('check_in_date', 'desc')
      .limit(60)
      .pluck('check_in_date')

    const streak = this.calculateStreak(recentAttendance)

    return {
      totalAttendance: Number(attendance?.total_attendance ?? 0),
      attendanceThisMonth: Number(attendance?.this_month ?? 0),
      streakDays: streak,
      workoutsCompleted: Number(workouts?.total ?? 0),
      ptSessionsTotal: Number(ptStats?.pt_sessions_total ?? 0),
      ptSessionsUsed: Number(ptStats?.pt_sessions_used ?? 0),
      ptSessionsRemaining: Math.max(
        0,
        Number(ptStats?.pt_sessions_total ?? 0) - Number(ptStats?.pt_sessions_used ?? 0)
      ),
    }
  }

  private calculateStreak(dates: string[]): number {
    if (!dates.length) return 0

    let streak = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (let i = 0; i < dates.length; i++) {
      const expected = new Date(today)
      expected.setDate(today.getDate() - i)
      const expectedStr = expected.toISOString().split('T')[0]

      if (dates[i] === expectedStr) {
        streak++
      } else {
        break
      }
    }

    return streak
  }
}
