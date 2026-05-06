import { BaseSeeder } from '@adonisjs/lucid/seeders'
import db from '@adonisjs/lucid/services/db'
import hash from '@adonisjs/core/services/hash'
import { DateTime } from 'luxon'

const upsert = async (table: string, data: object) => {
  try {
    await db.table(table).insert(data)
  } catch (e: any) {
    if (e.code !== '23505') throw e
  }
}

export default class MainSeeder extends BaseSeeder {
  async run() {
    const now = DateTime.now().toSQL()!

    // ─── Super Admin ─────────────────────────────────────────────────────────
    await upsert('users', {
      id: 'a0000000-0000-0000-0000-000000000001',
      phone: '+919999999999',
      email: 'admin@gymos.in',
      password_hash: await hash.make('SuperAdmin@123'),
      full_name: 'GymOS Super Admin',
      role: 'super_admin',
      is_phone_verified: true,
      is_email_verified: true,
      is_active: true,
      created_at: now,
      updated_at: now,
    })

    // ─── SaaS Plans ──────────────────────────────────────────────────────────
    const saasPlans = [
      { id: 'c0000000-0000-0000-0000-000000000001', name: 'Starter', slug: 'starter', price_monthly: 999, price_yearly: 9990, max_members: 100, max_branches: 1, max_trainers: 2, has_white_label: false, has_analytics: false, has_pt_management: false, has_diet_management: false, has_api_access: false, storage_gb: 5 },
      { id: 'c0000000-0000-0000-0000-000000000002', name: 'Professional', slug: 'professional', price_monthly: 2499, price_yearly: 24990, max_members: 500, max_branches: 3, max_trainers: 10, has_white_label: false, has_analytics: true, has_pt_management: true, has_diet_management: true, has_api_access: false, storage_gb: 20 },
      { id: 'c0000000-0000-0000-0000-000000000003', name: 'Enterprise', slug: 'enterprise', price_monthly: 5999, price_yearly: 59990, max_members: -1, max_branches: -1, max_trainers: -1, has_white_label: true, has_analytics: true, has_pt_management: true, has_diet_management: true, has_api_access: true, storage_gb: 100 },
    ]

    for (const plan of saasPlans) {
      await upsert('saas_plans', { ...plan, is_active: true, created_at: now, updated_at: now })
    }

    // ─── Demo Gym ─────────────────────────────────────────────────────────────
    const gymOwnerId = 'a0000000-0000-0000-0000-000000000002'
    const gymId = 'd0000000-0000-0000-0000-000000000001'
    const branchId = 'e0000000-0000-0000-0000-000000000001'

    await upsert('users', {
      id: gymOwnerId,
      phone: '+918888888888',
      email: 'owner@fitlife.in',
      password_hash: await hash.make('GymOwner@123'),
      full_name: 'Rajesh Kumar',
      role: 'gym_owner',
      is_phone_verified: true,
      is_email_verified: true,
      is_active: true,
      created_at: now,
      updated_at: now,
    })

    await upsert('gyms', {
      id: gymId,
      name: 'FitLife Gym',
      slug: 'fitlife-gym',
      gym_code: 'FITLFE',
      owner_id: gymOwnerId,
      email: 'hello@fitlife.in',
      phone: '+918888888888',
      address_line1: '42, MG Road',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560001',
      country: 'India',
      status: 'active',
      is_verified: true,
      primary_color: '#6366f1',
      secondary_color: '#8b5cf6',
      accent_color: '#a78bfa',
      timings: JSON.stringify({ monday: { open: '05:30', close: '22:00' }, tuesday: { open: '05:30', close: '22:00' }, wednesday: { open: '05:30', close: '22:00' }, thursday: { open: '05:30', close: '22:00' }, friday: { open: '05:30', close: '22:00' }, saturday: { open: '06:00', close: '21:00' }, sunday: { open: '07:00', close: '20:00' } }),
      facilities: JSON.stringify(['cardio', 'weights', 'yoga', 'steam', 'locker']),
      created_at: now,
      updated_at: now,
    })

    await upsert('gym_branches', {
      id: branchId,
      gym_id: gymId,
      name: 'Main Branch',
      code: 'MAIN',
      address_line1: '42, MG Road',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560001',
      phone: '+918888888888',
      is_main_branch: true,
      is_active: true,
      created_at: now,
      updated_at: now,
    })

    // Link gym owner to gym after gym is created
    await db.from('users').where('id', gymOwnerId).update({ gym_id: gymId, updated_at: now })

    await upsert('gym_subscriptions', {
      id: 'f0000000-0000-0000-0000-000000000001',
      gym_id: gymId,
      saas_plan_id: 'c0000000-0000-0000-0000-000000000002',
      status: 'active',
      billing_cycle: 'monthly',
      current_period_start: now,
      current_period_end: DateTime.now().plus({ months: 1 }).toSQL()!,
      created_at: now,
      updated_at: now,
    })

    // ─── Membership Plans ─────────────────────────────────────────────────────
    const membershipPlans = [
      { id: '10000000-0000-0000-0000-000000000001', name: 'Monthly Basic', duration_days: 30, price: 999, plan_type: 'standard', includes_pt: false, max_freeze_days: 0 },
      { id: '10000000-0000-0000-0000-000000000002', name: 'Quarterly', duration_days: 90, price: 2499, plan_type: 'standard', includes_pt: false, max_freeze_days: 7 },
      { id: '10000000-0000-0000-0000-000000000003', name: 'Half Yearly', duration_days: 180, price: 4499, plan_type: 'standard', includes_pt: false, max_freeze_days: 14 },
      { id: '10000000-0000-0000-0000-000000000004', name: 'Annual Premium', duration_days: 365, price: 7999, plan_type: 'premium', includes_pt: true, pt_sessions_count: 4, max_freeze_days: 30 },
    ]

    for (const plan of membershipPlans) {
      await upsert('membership_plans', { ...plan, gym_id: gymId, is_active: true, created_at: now, updated_at: now })
    }

    // ─── Demo Trainer ─────────────────────────────────────────────────────────
    const trainerId = 'a0000000-0000-0000-0000-000000000003'

    await upsert('users', {
      id: trainerId,
      phone: '+917777777777',
      email: 'trainer@fitlife.in',
      password_hash: await hash.make('Trainer@123'),
      full_name: 'Priya Sharma',
      role: 'trainer',
      gym_id: gymId,
      is_phone_verified: true,
      is_email_verified: true,
      is_active: true,
      created_at: now,
      updated_at: now,
    })

    // ─── Demo Member ──────────────────────────────────────────────────────────
    const memberId = 'a0000000-0000-0000-0000-000000000004'

    await upsert('users', {
      id: memberId,
      phone: '+916666666666',
      email: 'member@example.com',
      password_hash: await hash.make('Member@123'),
      full_name: 'Arjun Mehta',
      role: 'member',
      gym_id: gymId,
      is_phone_verified: true,
      is_email_verified: true,
      is_active: true,
      created_at: now,
      updated_at: now,
    })

    await upsert('gym_members', {
      id: '20000000-0000-0000-0000-000000000001',
      gym_id: gymId,
      user_id: memberId,
      assigned_trainer_id: trainerId,
      member_code: 'FITLFE-001',
      status: 'active',
      joined_at: DateTime.now().toSQLDate()!,
      height_cm: 175,
      weight_kg: 75,
      fitness_goal: 'muscle_gain',
      created_at: now,
      updated_at: now,
    })

    await upsert('member_subscriptions', {
      id: '30000000-0000-0000-0000-000000000001',
      gym_id: gymId,
      gym_member_id: '20000000-0000-0000-0000-000000000001',
      membership_plan_id: '10000000-0000-0000-0000-000000000002',
      status: 'active',
      starts_at: DateTime.now().toSQLDate()!,
      expires_at: DateTime.now().plus({ days: 90 }).toSQLDate()!,
      amount_paid: 2499,
      payment_mode: 'cash',
      freeze_days_used: 0,
      created_at: now,
      updated_at: now,
    })

    console.log('✅ Seed complete')
    console.log('   Super Admin : admin@gymos.in     / SuperAdmin@123')
    console.log('   Gym Owner   : owner@fitlife.in   / GymOwner@123')
    console.log('   Trainer     : trainer@fitlife.in / Trainer@123')
    console.log('   Member      : member@example.com / Member@123')
    console.log('   Demo Gym ID :', gymId)
  }
}
