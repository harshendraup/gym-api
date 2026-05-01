import { BaseSeeder } from '@adonisjs/lucid/seeders'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import bcrypt from 'bcrypt'

export default class MainSeeder extends BaseSeeder {
  async run() {
    const now = DateTime.now().toSQL()!

    // ─── Super Admin ────────────────────────────────────────────────────────
    const superAdminId = 'a0000000-0000-0000-0000-000000000001'
    const passwordHash = await bcrypt.hash('SuperAdmin@123', 10)

    await db.table('users').insert({
      id: superAdminId,
      phone: '+919999999999',
      email: 'admin@gymos.in',
      password_hash: passwordHash,
      full_name: 'GymOS Super Admin',
      is_phone_verified: true,
      is_email_verified: true,
      created_at: now,
      updated_at: now,
    }).onConflict('phone').ignore()

    const existingRole = await db.from('user_gym_roles').where('user_id', superAdminId).where('role', 'super_admin').first()
    if (!existingRole) {
      await db.table('user_gym_roles').insert({
        id: 'b0000000-0000-0000-0000-000000000001',
        user_id: superAdminId,
        gym_id: null,
        role: 'super_admin',
        is_active: true,
        created_at: now,
        updated_at: now,
      })
    }

    // ─── SaaS Plans ─────────────────────────────────────────────────────────
    const saasPlans = [
      {
        id: 'c0000000-0000-0000-0000-000000000001',
        name: 'Starter',
        slug: 'starter',
        price_monthly: 999,
        price_yearly: 9990,
        max_members: 100,
        max_branches: 1,
        max_trainers: 2,
        features: JSON.stringify({
          workouts: false,
          diet: false,
          analytics: false,
          pushNotifications: false,
          whiteLabel: false,
          apiAccess: false,
        }),
      },
      {
        id: 'c0000000-0000-0000-0000-000000000002',
        name: 'Professional',
        slug: 'professional',
        price_monthly: 2499,
        price_yearly: 24990,
        max_members: 500,
        max_branches: 3,
        max_trainers: 10,
        features: JSON.stringify({
          workouts: true,
          diet: true,
          analytics: true,
          pushNotifications: true,
          whiteLabel: false,
          apiAccess: false,
        }),
      },
      {
        id: 'c0000000-0000-0000-0000-000000000003',
        name: 'Enterprise',
        slug: 'enterprise',
        price_monthly: 5999,
        price_yearly: 59990,
        max_members: -1,
        max_branches: -1,
        max_trainers: -1,
        features: JSON.stringify({
          workouts: true,
          diet: true,
          analytics: true,
          pushNotifications: true,
          whiteLabel: true,
          apiAccess: true,
        }),
      },
    ]

    for (const plan of saasPlans) {
      await db.table('saas_plans').insert({
        ...plan,
        is_active: true,
        created_at: now,
        updated_at: now,
      }).onConflict('slug').ignore()
    }

    // ─── Demo Gym ────────────────────────────────────────────────────────────
    const gymOwnerPassword = await bcrypt.hash('GymOwner@123', 10)
    const gymOwnerId = 'a0000000-0000-0000-0000-000000000002'
    const gymId = 'd0000000-0000-0000-0000-000000000001'
    const branchId = 'e0000000-0000-0000-0000-000000000001'

    await db.table('users').insert({
      id: gymOwnerId,
      phone: '+918888888888',
      email: 'owner@fitlife.in',
      password_hash: gymOwnerPassword,
      full_name: 'Rajesh Kumar',
      is_phone_verified: true,
      is_email_verified: true,
      created_at: now,
      updated_at: now,
    }).onConflict('phone').ignore()

    await db.table('gyms').insert({
      id: gymId,
      name: 'FitLife Gym',
      slug: 'fitlife-gym',
      gym_code: 'FITLFE',
      owner_id: gymOwnerId,
      email: 'hello@fitlife.in',
      phone: '+918888888888',
      address: '42, MG Road',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560001',
      country: 'India',
      status: 'active',
      is_verified: true,
      branding: JSON.stringify({
        primaryColor: '#6366f1',
        secondaryColor: '#8b5cf6',
        accentColor: '#a78bfa',
      }),
      timings: JSON.stringify({
        monday: { open: '05:30', close: '22:00' },
        tuesday: { open: '05:30', close: '22:00' },
        wednesday: { open: '05:30', close: '22:00' },
        thursday: { open: '05:30', close: '22:00' },
        friday: { open: '05:30', close: '22:00' },
        saturday: { open: '06:00', close: '21:00' },
        sunday: { open: '07:00', close: '20:00' },
      }),
      facilities: JSON.stringify(['cardio', 'weights', 'yoga', 'steam', 'locker']),
      created_at: now,
      updated_at: now,
    }).onConflict('slug').ignore()

    await db.table('gym_branches').insert({
      id: branchId,
      gym_id: gymId,
      name: 'Main Branch',
      code: 'MAIN',
      address: '42, MG Road',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560001',
      phone: '+918888888888',
      is_main: true,
      is_active: true,
      created_at: now,
      updated_at: now,
    }).onConflict(['gym_id', 'code']).ignore()

    // Gym subscription
    await db.table('gym_subscriptions').insert({
      id: 'f0000000-0000-0000-0000-000000000001',
      gym_id: gymId,
      saas_plan_id: 'c0000000-0000-0000-0000-000000000002',
      status: 'active',
      billing_cycle: 'monthly',
      current_period_start: now,
      current_period_end: DateTime.now().plus({ months: 1 }).toSQL()!,
      created_at: now,
      updated_at: now,
    }).onConflict('gym_id').ignore()

    // Gym owner role
    await db.table('user_gym_roles').insert({
      id: 'b0000000-0000-0000-0000-000000000002',
      user_id: gymOwnerId,
      gym_id: gymId,
      role: 'gym_owner',
      is_active: true,
      created_at: now,
      updated_at: now,
    }).onConflict(['user_id', 'gym_id', 'role']).ignore()

    // ─── Membership Plans ────────────────────────────────────────────────────
    const membershipPlans = [
      { id: '10000000-0000-0000-0000-000000000001', name: 'Monthly Basic', duration_months: 1, price: 999, category: 'basic', includes_pt: false, freeze_days_allowed: 0 },
      { id: '10000000-0000-0000-0000-000000000002', name: 'Quarterly', duration_months: 3, price: 2499, category: 'standard', includes_pt: false, freeze_days_allowed: 7 },
      { id: '10000000-0000-0000-0000-000000000003', name: 'Half Yearly', duration_months: 6, price: 4499, category: 'standard', includes_pt: false, freeze_days_allowed: 14 },
      { id: '10000000-0000-0000-0000-000000000004', name: 'Annual Premium', duration_months: 12, price: 7999, category: 'premium', includes_pt: true, pt_sessions_included: 4, freeze_days_allowed: 30 },
    ]

    for (const plan of membershipPlans) {
      await db.table('membership_plans').insert({
        ...plan,
        gym_id: gymId,
        is_active: true,
        created_at: now,
        updated_at: now,
      }).onConflict(['gym_id', 'name']).ignore()
    }

    // ─── Demo Trainer ────────────────────────────────────────────────────────
    const trainerId = 'a0000000-0000-0000-0000-000000000003'
    const trainerPassword = await bcrypt.hash('Trainer@123', 10)

    await db.table('users').insert({
      id: trainerId,
      phone: '+917777777777',
      email: 'trainer@fitlife.in',
      password_hash: trainerPassword,
      full_name: 'Priya Sharma',
      is_phone_verified: true,
      is_email_verified: true,
      created_at: now,
      updated_at: now,
    }).onConflict('phone').ignore()

    await db.table('user_gym_roles').insert({
      id: 'b0000000-0000-0000-0000-000000000003',
      user_id: trainerId,
      gym_id: gymId,
      role: 'trainer',
      is_active: true,
      metadata: JSON.stringify({
        specializations: ['strength', 'HIIT', 'yoga'],
        experience: 5,
        bio: 'Certified personal trainer with 5 years of experience in strength training and HIIT.',
        branchIds: [branchId],
      }),
      created_at: now,
      updated_at: now,
    }).onConflict(['user_id', 'gym_id', 'role']).ignore()

    // ─── Demo Member ─────────────────────────────────────────────────────────
    const memberId = 'a0000000-0000-0000-0000-000000000004'
    const memberPassword = await bcrypt.hash('Member@123', 10)

    await db.table('users').insert({
      id: memberId,
      phone: '+916666666666',
      email: 'member@example.com',
      password_hash: memberPassword,
      full_name: 'Arjun Mehta',
      is_phone_verified: true,
      created_at: now,
      updated_at: now,
    }).onConflict('phone').ignore()

    await db.table('gym_members').insert({
      id: '20000000-0000-0000-0000-000000000001',
      gym_id: gymId,
      user_id: memberId,
      trainer_id: trainerId,
      member_code: 'FITLFE-001',
      status: 'active',
      join_date: DateTime.now().toSQLDate()!,
      gender: 'male',
      date_of_birth: '1995-03-15',
      height_cm: 175,
      weight_kg: 75,
      fitness_goal: 'muscle_gain',
      created_at: now,
      updated_at: now,
    }).onConflict(['gym_id', 'user_id']).ignore()

    await db.table('user_gym_roles').insert({
      id: 'b0000000-0000-0000-0000-000000000004',
      user_id: memberId,
      gym_id: gymId,
      role: 'member',
      is_active: true,
      created_at: now,
      updated_at: now,
    }).onConflict(['user_id', 'gym_id', 'role']).ignore()

    // Active subscription for demo member
    const expiresAt = DateTime.now().plus({ months: 3 })
    await db.table('member_subscriptions').insert({
      id: '30000000-0000-0000-0000-000000000001',
      gym_id: gymId,
      gym_member_id: '20000000-0000-0000-0000-000000000001',
      membership_plan_id: '10000000-0000-0000-0000-000000000002',
      status: 'active',
      start_date: DateTime.now().toSQLDate()!,
      expires_at: expiresAt.toSQLDate()!,
      amount_paid: 2499,
      payment_method: 'cash',
      freeze_days_used: 0,
      grace_period_days: 7,
      created_at: now,
      updated_at: now,
    }).onConflict('id').ignore()

    console.log('✅ Seed complete')
    console.log('   Super Admin: +919999999999 / SuperAdmin@123')
    console.log('   Gym Owner:   +918888888888 / GymOwner@123')
    console.log('   Trainer:     +917777777777 / Trainer@123')
    console.log('   Member:      +916666666666 / Member@123')
    console.log('   Demo Gym ID:', gymId)
  }
}
