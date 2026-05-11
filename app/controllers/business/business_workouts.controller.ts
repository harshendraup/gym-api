import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import db from '@adonisjs/lucid/services/db'

const modelValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(2).maxLength(150),
    description: vine.string().trim().optional(),
    goal: vine.enum(['fat_loss', 'muscle_gain', 'general_fitness', 'rehab', 'sports']).optional(),
    difficulty: vine.enum(['beginner', 'intermediate', 'advanced']).optional(),
    durationWeeks: vine.number().min(1).max(156),
    sessionsPerWeek: vine.number().min(1).max(14),
    status: vine.enum(['draft', 'active', 'archived']).optional(),
    days: vine
      .array(
        vine.object({
          weekNumber: vine.number().min(1),
          dayNumber: vine.number().min(1).max(7),
          title: vine.string().trim().optional(),
          isRestDay: vine.boolean().optional(),
          notes: vine.string().trim().optional(),
          exercises: vine
            .array(
              vine.object({
                exerciseName: vine.string().trim(),
                sets: vine.number().min(0).optional(),
                reps: vine.string().trim().optional(),
                loadType: vine.string().trim().optional(),
                tempo: vine.string().trim().optional(),
                restSeconds: vine.number().min(0).optional(),
                notes: vine.string().trim().optional(),
              })
            )
            .optional(),
        })
      )
      .optional(),
  })
)

const assignValidator = vine.compile(
  vine.object({
    memberId: vine.string().uuid(),
    workoutModelId: vine.string().uuid(),
    startDate: vine.date({ formats: ['YYYY-MM-DD'] }),
    endDate: vine.date({ formats: ['YYYY-MM-DD'] }).optional(),
    coachNote: vine.string().trim().optional(),
  })
)

const logValidator = vine.compile(
  vine.object({
    sessionDate: vine.date({ formats: ['YYYY-MM-DD'] }),
    durationMinutes: vine.number().min(0).optional(),
    notes: vine.string().trim().optional(),
    exerciseLogs: vine.array(vine.object({ exerciseName: vine.string().trim(), completed: vine.boolean().optional(), notes: vine.string().trim().optional() })),
  })
)

const exerciseValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(2).maxLength(150),
    muscleGroup: vine.string().trim().optional(),
    equipment: vine.string().trim().optional(),
    instructions: vine.string().trim().optional(),
    mediaUrl: vine.string().trim().optional(),
    contraindications: vine.string().trim().optional(),
  })
)

export default class BusinessWorkoutsController {
  private toSqlDate(value: Date): string {
    return value.toISOString().slice(0, 10)
  }

  private ensureAccess(ctx: HttpContext): string {
    const actor = ctx.auth.getUserOrFail() as any
    const businessId = ctx.params.businessId as string
    if (!actor.businessId) throw new Error('BUSINESS_SCOPE_REQUIRED')
    if (actor.businessId !== businessId) throw new Error('BUSINESS_ACCESS_DENIED')
    return businessId
  }

  async listModels(ctx: HttpContext) {
    const businessId = this.ensureAccess(ctx)
    const models = await db.from('business_workout_models').where('business_id', businessId).where('is_active', true).orderBy('created_at', 'desc')
    return ctx.response.ok({ success: true, data: models })
  }

  async getModel(ctx: HttpContext) {
    const businessId = this.ensureAccess(ctx)
    const model = await db.from('business_workout_models').where('business_id', businessId).where('id', ctx.params.id).firstOrFail()
    const days = await db.from('business_workout_model_days').where('workout_model_id', model.id).orderBy('week_number', 'asc').orderBy('day_number', 'asc')
    const exercises = await db
      .from('business_workout_model_exercises as e')
      .join('business_workout_model_days as d', 'd.id', 'e.workout_day_id')
      .where('d.workout_model_id', model.id)
      .orderBy('d.week_number', 'asc')
      .orderBy('d.day_number', 'asc')
      .orderBy('e.sort_order', 'asc')
      .select('e.*')
    return ctx.response.ok({ success: true, data: { ...model, days, exercises } })
  }

  async createModel(ctx: HttpContext) {
    const businessId = this.ensureAccess(ctx)
    const actor = ctx.auth.getUserOrFail() as any
    const payload = await ctx.request.validateUsing(modelValidator)
    const modelId = crypto.randomUUID()

    await db.transaction(async (trx) => {
      await trx.table('business_workout_models').insert({
        id: modelId,
        business_id: businessId,
        created_by: actor.id,
        name: payload.name,
        description: payload.description ?? null,
        goal: payload.goal ?? 'general_fitness',
        difficulty: payload.difficulty ?? 'beginner',
        duration_weeks: payload.durationWeeks,
        sessions_per_week: payload.sessionsPerWeek,
        status: payload.status ?? 'draft',
        version: 1,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      })

      for (const day of payload.days ?? []) {
        const dayId = crypto.randomUUID()
        await trx.table('business_workout_model_days').insert({
          id: dayId,
          workout_model_id: modelId,
          week_number: day.weekNumber,
          day_number: day.dayNumber,
          title: day.title ?? null,
          is_rest_day: day.isRestDay ?? false,
          notes: day.notes ?? null,
          created_at: new Date(),
          updated_at: new Date(),
        })

        for (let i = 0; i < (day.exercises ?? []).length; i++) {
          const ex = day.exercises![i]
          await trx.table('business_workout_model_exercises').insert({
            id: crypto.randomUUID(),
            workout_day_id: dayId,
            sort_order: i,
            exercise_name: ex.exerciseName,
            sets: ex.sets ?? null,
            reps: ex.reps ?? null,
            load_type: ex.loadType ?? null,
            tempo: ex.tempo ?? null,
            rest_seconds: ex.restSeconds ?? null,
            notes: ex.notes ?? null,
            created_at: new Date(),
          })
        }
      }
    })

    const created = await db.from('business_workout_models').where('id', modelId).first()
    return ctx.response.created({ success: true, data: created })
  }

  async updateModel(ctx: HttpContext) {
    const businessId = this.ensureAccess(ctx)
    const existing = await db.from('business_workout_models').where('business_id', businessId).where('id', ctx.params.id).firstOrFail()
    const payload = await ctx.request.validateUsing(modelValidator)

    await db.from('business_workout_models').where('id', existing.id).update({
      name: payload.name,
      description: payload.description ?? null,
      goal: payload.goal ?? 'general_fitness',
      difficulty: payload.difficulty ?? 'beginner',
      duration_weeks: payload.durationWeeks,
      sessions_per_week: payload.sessionsPerWeek,
      status: payload.status ?? existing.status,
      version: Number(existing.version ?? 1) + 1,
      updated_at: new Date(),
    })

    return ctx.response.ok({ success: true, data: await db.from('business_workout_models').where('id', existing.id).first() })
  }

  async deleteModel(ctx: HttpContext) {
    const businessId = this.ensureAccess(ctx)
    await db.from('business_workout_models').where('business_id', businessId).where('id', ctx.params.id).update({ is_active: false, updated_at: new Date() })
    return ctx.response.ok({ success: true, data: { message: 'Workout model archived' } })
  }

  async assignModel(ctx: HttpContext) {
    const businessId = this.ensureAccess(ctx)
    const actor = ctx.auth.getUserOrFail()
    const payload = await ctx.request.validateUsing(assignValidator)

    const member = await db.from('users').where('id', payload.memberId).where('business_id', businessId).first()
    if (!member) return ctx.response.notFound({ success: false, error: { code: 'MEMBER_NOT_FOUND', message: 'Member not found in this business' } })

    const model = await db.from('business_workout_models').where('id', payload.workoutModelId).where('business_id', businessId).first()
    if (!model) return ctx.response.notFound({ success: false, error: { code: 'MODEL_NOT_FOUND', message: 'Workout model not found' } })

    const id = crypto.randomUUID()
    await db.table('business_workout_assignments').insert({
      id,
      business_id: businessId,
      member_id: payload.memberId,
      workout_model_id: payload.workoutModelId,
      assigned_by: actor.id,
      start_date: this.toSqlDate(payload.startDate),
      end_date: payload.endDate ? this.toSqlDate(payload.endDate) : null,
      status: 'scheduled',
      coach_note: payload.coachNote ?? null,
      created_at: new Date(),
      updated_at: new Date(),
    })

    return ctx.response.created({ success: true, data: await db.from('business_workout_assignments').where('id', id).first() })
  }

  async listAssignments(ctx: HttpContext) {
    const businessId = this.ensureAccess(ctx)
    const rows = await db
      .from('business_workout_assignments as a')
      .join('users as u', 'u.id', 'a.member_id')
      .join('business_workout_models as m', 'm.id', 'a.workout_model_id')
      .where('a.business_id', businessId)
      .orderBy('a.created_at', 'desc')
      .select('a.*', 'u.full_name as member_name', 'm.name as model_name')
    return ctx.response.ok({ success: true, data: rows })
  }

  async logSession(ctx: HttpContext) {
    const businessId = this.ensureAccess(ctx)
    const payload = await ctx.request.validateUsing(logValidator)
    const assignment = await db.from('business_workout_assignments').where('id', ctx.params.assignmentId).where('business_id', businessId).first()
    if (!assignment) return ctx.response.notFound({ success: false, error: { code: 'ASSIGNMENT_NOT_FOUND', message: 'Assignment not found' } })

    const id = crypto.randomUUID()
    await db.table('business_workout_session_logs').insert({
      id,
      business_id: businessId,
      assignment_id: assignment.id,
      member_id: assignment.member_id,
      session_date: this.toSqlDate(payload.sessionDate),
      duration_minutes: payload.durationMinutes ?? null,
      exercise_logs: JSON.stringify(payload.exerciseLogs),
      notes: payload.notes ?? null,
      created_at: new Date(),
    })
    return ctx.response.created({ success: true, data: await db.from('business_workout_session_logs').where('id', id).first() })
  }

  async createExercise(ctx: HttpContext) {
    const businessId = this.ensureAccess(ctx)
    const payload = await ctx.request.validateUsing(exerciseValidator)
    const id = crypto.randomUUID()
    await db.table('business_exercise_library').insert({
      id,
      business_id: businessId,
      name: payload.name,
      muscle_group: payload.muscleGroup ?? null,
      equipment: payload.equipment ?? null,
      instructions: payload.instructions ?? null,
      media_url: payload.mediaUrl ?? null,
      contraindications: payload.contraindications ?? null,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    })
    return ctx.response.created({ success: true, data: await db.from('business_exercise_library').where('id', id).first() })
  }

  async listExercises(ctx: HttpContext) {
    const businessId = this.ensureAccess(ctx)
    const rows = await db.from('business_exercise_library').where('business_id', businessId).where('is_active', true).orderBy('name', 'asc')
    return ctx.response.ok({ success: true, data: rows })
  }
}
