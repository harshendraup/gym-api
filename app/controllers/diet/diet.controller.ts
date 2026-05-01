import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import db from '@adonisjs/lucid/services/db'

const createPlanValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(2).maxLength(100),
    description: vine.string().trim().optional(),
    goal: vine.enum(['weight_loss', 'muscle_gain', 'maintenance', 'general_health']),
    dailyCalories: vine.number().positive().optional(),
    macros: vine.object({
      proteinG: vine.number().min(0).optional(),
      carbsG: vine.number().min(0).optional(),
      fatG: vine.number().min(0).optional(),
    }).optional(),
    meals: vine.array(
      vine.object({
        name: vine.string().trim(),
        mealType: vine.enum(['breakfast', 'morning_snack', 'lunch', 'evening_snack', 'dinner', 'pre_workout', 'post_workout']),
        time: vine.string().trim().optional(),
        items: vine.array(
          vine.object({
            name: vine.string().trim(),
            quantity: vine.string().trim(),
            calories: vine.number().min(0).optional(),
            protein: vine.number().min(0).optional(),
            carbs: vine.number().min(0).optional(),
            fat: vine.number().min(0).optional(),
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
    dietPlanId: vine.string().uuid(),
    startDate: vine.date({ formats: ['YYYY-MM-DD'] }),
    endDate: vine.date({ formats: ['YYYY-MM-DD'] }).optional(),
    notes: vine.string().trim().optional(),
  })
)

export default class DietController {
  async listPlans({ request, response, gymId }: HttpContext) {
    const { trainerId, goal, page = 1, limit = 20 } = request.qs()

    let query = db
      .from('diet_plans')
      .where('gym_id', gymId)
      .where('is_active', true)
      .orderBy('created_at', 'desc')

    if (trainerId) query = query.where('trainer_id', trainerId)
    if (goal) query = query.where('goal', goal)

    const plans = await query.paginate(Number(page), Number(limit))
    return response.ok({ success: true, data: plans })
  }

  async getPlan({ params, response, gymId }: HttpContext) {
    const plan = await db.from('diet_plans').where('gym_id', gymId).where('id', params.id).first()
    if (!plan) return response.notFound({ success: false, error: { code: 'NOT_FOUND', message: 'Diet plan not found' } })

    const meals = await db
      .from('diet_plan_meals')
      .where('diet_plan_id', plan.id)
      .orderBy('sort_order', 'asc')

    return response.ok({ success: true, data: { ...plan, meals } })
  }

  async createPlan({ request, response, gymId, auth }: HttpContext) {
    const payload = await request.validateUsing(createPlanValidator)

    const planId = crypto.randomUUID()

    await db.transaction(async (trx) => {
      await trx.table('diet_plans').insert({
        id: planId,
        gym_id: gymId,
        trainer_id: auth.getUserOrFail().id,
        name: payload.name,
        description: payload.description,
        goal: payload.goal,
        daily_calories: payload.dailyCalories,
        macros: payload.macros ? JSON.stringify(payload.macros) : null,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      })

      if (payload.meals?.length) {
        for (let i = 0; i < payload.meals.length; i++) {
          const meal = payload.meals[i]
          await trx.table('diet_plan_meals').insert({
            id: crypto.randomUUID(),
            diet_plan_id: planId,
            name: meal.name,
            meal_type: meal.mealType,
            time: meal.time,
            items: JSON.stringify(meal.items),
            sort_order: i,
            created_at: new Date(),
            updated_at: new Date(),
          })
        }
      }
    })

    const plan = await db.from('diet_plans').where('id', planId).first()
    return response.created({ success: true, data: plan })
  }

  async updatePlan({ params, request, response, gymId }: HttpContext) {
    const existing = await db.from('diet_plans').where('gym_id', gymId).where('id', params.id).first()
    if (!existing) return response.notFound({ success: false, error: { code: 'NOT_FOUND', message: 'Plan not found' } })

    const body = request.only(['name', 'description', 'goal', 'dailyCalories', 'macros', 'isActive'])

    await db.from('diet_plans').where('id', params.id).update({
      name: body.name ?? existing.name,
      description: body.description ?? existing.description,
      goal: body.goal ?? existing.goal,
      daily_calories: body.dailyCalories ?? existing.daily_calories,
      macros: body.macros ? JSON.stringify(body.macros) : existing.macros,
      is_active: body.isActive ?? existing.is_active,
      updated_at: new Date(),
    })

    const updated = await db.from('diet_plans').where('id', params.id).first()
    return response.ok({ success: true, data: updated })
  }

  async deletePlan({ params, response, gymId }: HttpContext) {
    const existing = await db.from('diet_plans').where('gym_id', gymId).where('id', params.id).first()
    if (!existing) return response.notFound({ success: false, error: { code: 'NOT_FOUND', message: 'Plan not found' } })

    await db.from('diet_plans').where('id', params.id).update({ is_active: false, updated_at: new Date() })
    return response.ok({ success: true, message: 'Plan deactivated' })
  }

  async assignPlan({ request, response, gymId }: HttpContext) {
    const payload = await request.validateUsing(assignPlanValidator)

    const member = await db.from('gym_members').where('gym_id', gymId).where('id', payload.gymMemberId).first()
    if (!member) return response.notFound({ success: false, error: { code: 'NOT_FOUND', message: 'Member not found' } })

    const plan = await db.from('diet_plans').where('gym_id', gymId).where('id', payload.dietPlanId).first()
    if (!plan) return response.notFound({ success: false, error: { code: 'NOT_FOUND', message: 'Plan not found' } })

    // Deactivate previous assignment
    await db.from('member_diet_assignments')
      .where('gym_member_id', payload.gymMemberId)
      .where('is_active', true)
      .update({ is_active: false, updated_at: new Date() })

    const assignment = await db.table('member_diet_assignments').insert({
      id: crypto.randomUUID(),
      gym_id: gymId,
      gym_member_id: payload.gymMemberId,
      diet_plan_id: payload.dietPlanId,
      start_date: payload.startDate,
      end_date: payload.endDate ?? null,
      notes: payload.notes,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    }).returning('*')

    return response.created({ success: true, data: assignment[0] })
  }

  async getMemberAssignment({ params, response, gymId }: HttpContext) {
    const assignment = await db
      .from('member_diet_assignments as mda')
      .join('diet_plans as dp', 'dp.id', 'mda.diet_plan_id')
      .where('mda.gym_id', gymId)
      .where('mda.gym_member_id', params.memberId)
      .where('mda.is_active', true)
      .select('mda.*', 'dp.name as plan_name', 'dp.goal', 'dp.daily_calories', 'dp.macros')
      .first()

    if (!assignment) return response.ok({ success: true, data: null })

    const meals = await db.from('diet_plan_meals').where('diet_plan_id', assignment.diet_plan_id).orderBy('sort_order', 'asc')
    return response.ok({ success: true, data: { ...assignment, meals } })
  }
}
