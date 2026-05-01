import vine from '@vinejs/vine'

export const createMemberValidator = vine.compile(
  vine.object({
    // User info (if creating new user)
    phone: vine.string().trim().regex(/^[6-9]\d{9}$/).optional(),
    email: vine.string().trim().email().optional(),
    fullName: vine.string().trim().minLength(2).maxLength(100),
    gender: vine.enum(['male', 'female', 'other']).optional(),
    dateOfBirth: vine.date({ formats: ['YYYY-MM-DD'] }).optional(),
    profilePhotoUrl: vine.string().url().optional(),

    // Gym-specific member info
    branchId: vine.string().uuid().optional(),
    assignedTrainerId: vine.string().uuid().optional(),
    heightCm: vine.number().min(50).max(300).optional(),
    weightKg: vine.number().min(10).max(500).optional(),
    fitnessGoal: vine
      .enum(['weight_loss', 'muscle_gain', 'endurance', 'flexibility', 'general_fitness'])
      .optional(),
    medicalNotes: vine.string().trim().maxLength(1000).optional(),
    emergencyContactName: vine.string().trim().maxLength(100).optional(),
    emergencyContactPhone: vine.string().trim().regex(/^[6-9]\d{9}$/).optional(),
    source: vine.string().trim().maxLength(50).optional(),
  })
)

export const updateMemberValidator = vine.compile(
  vine.object({
    fullName: vine.string().trim().minLength(2).maxLength(100).optional(),
    profilePhotoUrl: vine.string().url().optional(),
    branchId: vine.string().uuid().optional(),
    assignedTrainerId: vine.string().uuid().optional(),
    heightCm: vine.number().min(50).max(300).optional(),
    weightKg: vine.number().min(10).max(500).optional(),
    fitnessGoal: vine
      .enum(['weight_loss', 'muscle_gain', 'endurance', 'flexibility', 'general_fitness'])
      .optional(),
    medicalNotes: vine.string().trim().maxLength(1000).optional(),
    emergencyContactName: vine.string().trim().maxLength(100).optional(),
    emergencyContactPhone: vine.string().trim().optional(),
  })
)

export const listMembersValidator = vine.compile(
  vine.object({
    status: vine.enum(['active', 'expired', 'frozen', 'pending', 'cancelled']).optional(),
    branchId: vine.string().uuid().optional(),
    trainerId: vine.string().uuid().optional(),
    search: vine.string().trim().minLength(2).maxLength(100).optional(),
    page: vine.number().min(1).optional(),
    perPage: vine.number().min(1).max(100).optional(),
  })
)
