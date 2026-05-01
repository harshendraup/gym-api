import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import db from '@adonisjs/lucid/services/db'

const createPlanValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(2).maxLength(100),
    description: vine.string().trim().optional(),
    durationWeeks: vine.number().positive().optional(),
    difficulty: vine.enum(['beginner', 'intermediate', 'advanced']),
    goal: vine.enum(['weight_loss', 'muscle_gain', 'endurance', 'flexibility', 'general_fitness']),
    days: vine.array(
      vine.object({
        dayNumber: vine.number().min(1).max(7),
        name: vine.string().trim(),
        exercises: vine.array(
          vine.object({
            exerciseId: vine.string().uuid(),
            sets: vine.number().positive(),
            reps: vine.string().trim().optional(),
            duration: vine.number().optional(),
            restSeconds: vine.number().optional(),
            notes: vine.string().trim().optional(),
          })
        ),
      })
    ).optional(),
  })
)

const assignPlanValidator = vine.compile(
  vine.object({
    gymMemberId: vine.string().uuid(),
    workoutPlanId: vine.string().uuid(),
    startDate: vine.date({ formats: ['YYYY-MM-DD'] }),
    endDate: vine.date({ formats: ['YYYY-MM-DD'] }).optional(),
  })
)

const logWorkoutValidator = vine.compile(
  vine.object({
    workoutPlanId: vine.string().uuid(),
    workoutDayId: vine.string().uuid(),
    loggedAt: vine.date({ formats: ['YYYY-MM-DD'] }).optional(),
    exercises: vine.array(
      vine.object({
        exerciseId: vine.string().uuid(),
        sets: vine.array(
          vine.object({
            reps: vine.number().optional(),
            weight: vine.number().optional(),
            duration: vine.number().optional(),
            completed: vine.boolean(),
          })
        ),
        notes: vine.string().trim().optional(),
      })
    ),
    notes: vine.string().trim().optional(),
    durationMinutes: vine.number().positive().optional(),
  })
)

export default class WorkoutsController {
  // ─── Exercises ─────────────────────────────────────────────────────────────

  async listExercises({ request, response, gymId }: HttpContext) {
    const { category, muscle, search, page = 1, limit = 20 } = request.qs()

    let query = db
      .from('exercises')
      .where((q) => {
        q.where('gym_id', gymId).orWhereNull('gym_id')
      })
      .orderBy('name', 'asc')

    if (category) query = query.where('category', category)
    if (muscle) query = query.whereRaw(`muscle_groups @> ?::jsonb`, [JSON.stringify([muscle])])
    if (search) query = query.whereILike('name', `%${search}%`)

    const exercises = await query.paginate(Number(page), Number(limit))
    return response.ok({ success: true, data: exercises })
  }

  async createExercise({ request, response, gymId, auth }: HttpContext) {
    const body = request.only(['name', 'description', 'category', 'muscleGroups', 'equipment', 'videoUrl', 'thumbnailUrl', 'instructions'])

    const exercise = await db.table('exercises').insert({
      id: crypto.randomUUID(),
      gym_id: gymId,
      name: body.name,
      description: body.description,
      category: body.category,
      muscle_groups: JSON.stringify(body.muscleGroups ?? []),
      equipment: JSON.stringify(body.equipment ?? []),
      video_url: body.videoUrl,
      thumbnail_url: body.thumbnailUrl,
      instructions: body.instructions,
      created_by: auth.getUserOrFail().id,
      created_at: new Date(),
      updated_at: new Date(),
    }).returning('*')

    return response.created({ success: true, data: exercise[0] })
  }

  // ─── Workout Plans ──────────────────────────────────────────────────────────

  async listPlans({ request, response, gymId }: HttpContext) {
    const { trainerId, difficulty, goal, page = 1, limit = 20 } = request.qs()

    let query = db
      .from('workout_plans')
      .where('gym_id', gymId)
      .where('is_active', true)
      .orderBy('created_at', 'desc')

    if (trainerId) query = query.where('trainer_id', trainerId)
    if (difficulty) query = query.where('difficulty', difficulty)
    if (goal) query = query.where('goal', goal)

    const plans = await query.paginate(Number(page), Number(limit))
    return response.ok({ success: true, data: plans })
  }

  async getPlan({ params, response, gymId }: HttpContext) {
    const plan = await db
      .from('workout_plans')
      .where('gym_id', gymId)
      .where('id', params.id)
      .first()

    if (!plan) return response.notFound({ success: false, error: { code: 'NOT_FOUND', message: 'Workout plan not found' } })

    const days = await db
      .from('workout_days as wd')
      .leftJoin('workout_day_exercises as wde', 'wde.workout_day_id', 'wd.id')
      .leftJoin('exercises as e', 'e.id', 'wde.exercise_id')
      .where('wd.workout_plan_id', plan.id)
      .orderBy('wd.day_number', 'asc')
      .orderBy('wde.sort_order', 'asc')
      .select(
        'wd.id as day_id',
        'wd.day_number',
        'wd.name as day_name',
        'wde.id as we_id',
        'wde.sets',
        'wde.reps',
        'wde.duration',
        'wde.rest_seconds',
        'wde.notes as we_notes',
        'wde.sort_order',
        'e.id as exercise_id',
        'e.name as exercise_name',
        'e.category',
        'e.muscle_groups',
        'e.thumbnail_url'
      )

    return response.ok({ success: true, data: { ...plan, days } })
  }

  async createPlan({ request, response, gymId, auth }: HttpContext) {
    const payload = await request.validateUsing(createPlanValidator)

    const planId = crypto.randomUUID()

    await db.transaction(async (trx) => {
      await trx.table('workout_plans').insert({
        id: planId,
        gym_id: gymId,
        trainer_id: auth.getUserOrFail().id,
        name: payload.name,
        description: payload.description,
        duration_weeks: payload.durationWeeks,
        difficulty: payload.difficulty,
        goal: payload.goal,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      })

      if (payload.days?.length) {
        for (const day of payload.days) {
          const dayId = crypto.randomUUID()
          await trx.table('workout_days').insert({
            id: dayId,
            workout_plan_id: planId,
            day_number: day.dayNumber,
            name: day.name,
            created_at: new Date(),
            updated_at: new Date(),
          })

          for (let i = 0; i < day.exercises.length; i++) {
            const ex = day.exercises[i]
            await trx.table('workout_day_exercises').insert({
              id: crypto.randomUUID(),
              workout_day_id: dayId,
              exercise_id: ex.exerciseId,
              sets: ex.sets,
              reps: ex.reps,
              duration: ex.duration,
              rest_seconds: ex.restSeconds,
              notes: ex.notes,
              sort_order: i,
              created_at: new Date(),
              updated_at: new Date(),
            })
          }
        }
      }
    })

    const plan = await db.from('workout_plans').where('id', planId).first()
    return response.created({ success: true, data: plan })
  }

  async updatePlan({ params, request, response, gymId }: HttpContext) {
    const existing = await db.from('workout_plans').where('gym_id', gymId).where('id', params.id).first()
    if (!existing) return response.notFound({ success: false, error: { code: 'NOT_FOUND', message: 'Plan not found' } })

    const body = request.only(['name', 'description', 'durationWeeks', 'difficulty', 'goal', 'isActive'])

    await db.from('workout_plans').where('id', params.id).update({
      name: body.name ?? existing.name,
      description: body.description ?? existing.description,
      duration_weeks: body.durationWeeks ?? existing.duration_weeks,
      difficulty: body.difficulty ?? existing.difficulty,
      goal: body.goal ?? existing.goal,
      is_active: body.isActive ?? existing.is_active,
      updated_at: new Date(),
    })

    const updated = await db.from('workout_plans').where('id', params.id).first()
    return response.ok({ success: true, data: updated })
  }

  async deletePlan({ params, response, gymId }: HttpContext) {
    const existing = await db.from('workout_plans').where('gym_id', gymId).where('id', params.id).first()
    if (!existing) return response.notFound({ success: false, error: { code: 'NOT_FOUND', message: 'Plan not found' } })

    await db.from('workout_plans').where('id', params.id).update({ is_active: false, updated_at: new Date() })
    return response.ok({ success: true, message: 'Plan deactivated' })
  }

  // ─── Assignments ───────────────────────────────────────────────────────────

  async assignPlan({ request, response, gymId }: HttpContext) {
    const payload = await request.validateUsing(assignPlanValidator)

    const member = await db.from('gym_members').where('gym_id', gymId).where('id', payload.gymMemberId).first()
    if (!member) return response.notFound({ success: false, error: { code: 'NOT_FOUND', message: 'Member not found' } })

    const plan = await db.from('workout_plans').where('gym_id', gymId).where('id', payload.workoutPlanId).first()
    if (!plan) return response.notFound({ success: false, error: { code: 'NOT_FOUND', message: 'Plan not found' } })

    // Deactivate existing assignment
    await db.from('member_workout_assignments')
      .where('gym_member_id', payload.gymMemberId)
      .where('is_active', true)
      .update({ is_active: false, updated_at: new Date() })

    const assignment = await db.table('member_workout_assignments').insert({
      id: crypto.randomUUID(),
      gym_id: gymId,
      gym_member_id: payload.gymMemberId,
      workout_plan_id: payload.workoutPlanId,
      start_date: payload.startDate,
      end_date: payload.endDate ?? null,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    }).returning('*')

    return response.created({ success: true, data: assignment[0] })
  }

  async getMemberAssignment({ params, response, gymId }: HttpContext) {
    const assignment = await db
      .from('member_workout_assignments as mwa')
      .join('workout_plans as wp', 'wp.id', 'mwa.workout_plan_id')
      .where('mwa.gym_id', gymId)
      .where('mwa.gym_member_id', params.memberId)
      .where('mwa.is_active', true)
      .select('mwa.*', 'wp.name as plan_name', 'wp.difficulty', 'wp.goal', 'wp.duration_weeks')
      .first()

    return response.ok({ success: true, data: assignment ?? null })
  }

  // ─── Workout Logs ──────────────────────────────────────────────────────────

  async logWorkout({ request, response, gymId, auth }: HttpContext) {
    const payload = await request.validateUsing(logWorkoutValidator)
    const userId = auth.getUserOrFail().id

    const member = await db.from('gym_members').where('gym_id', gymId).where('user_id', userId).first()
    if (!member) return response.notFound({ success: false, error: { code: 'NOT_FOUND', message: 'Member not found' } })

    const log = await db.table('workout_logs').insert({
      id: crypto.randomUUID(),
      gym_id: gymId,
      gym_member_id: member.id,
      workout_plan_id: payload.workoutPlanId,
      workout_day_id: payload.workoutDayId,
      exercises: JSON.stringify(payload.exercises),
      notes: payload.notes,
      duration_minutes: payload.durationMinutes,
      logged_at: payload.loggedAt ?? new Date(),
      created_at: new Date(),
    }).returning('*')

    return response.created({ success: true, data: log[0] })
  }

  async getMemberLogs({ params, request, response, gymId }: HttpContext) {
    const { limit = 20, page = 1 } = request.qs()

    const logs = await db
      .from('workout_logs')
      .where('gym_id', gymId)
      .where('gym_member_id', params.memberId)
      .orderBy('logged_at', 'desc')
      .paginate(Number(page), Number(limit))

    return response.ok({ success: true, data: logs })
  }
}
