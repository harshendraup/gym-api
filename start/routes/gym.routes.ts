import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const MembersController = () => import('#controllers/members/members.controller')
const MembershipsController = () => import('#controllers/memberships/memberships.controller')
const PaymentsController = () => import('#controllers/payments/payments.controller')
const AttendanceController = () => import('#controllers/attendance/attendance.controller')
const WorkoutsController = () => import('#controllers/workouts/workouts.controller')
const DietController = () => import('#controllers/diet/diet.controller')
const NotificationsController = () => import('#controllers/notifications/notifications.controller')
const AnalyticsController = () => import('#controllers/analytics/analytics.controller')
const TrainersController = () => import('#controllers/trainers/trainers.controller')
const GymController = () => import('#controllers/gym/gym.controller')
const BranchesController = () => import('#controllers/gym/branches.controller')
const PtController = () => import('#controllers/pt/pt.controller')

router
  .group(() => {
    // -----------------------------------------------------------------------
    // Gym Profile
    // -----------------------------------------------------------------------
    router.get('/', [GymController, 'show']).as('gym.show')
    router.put('/', [GymController, 'update']).as('gym.update').use(middleware.rbac(['gym_owner']))
    router.get('/branding', [GymController, 'branding']).as('gym.branding')  // public

    // Branches
    router.resource('branches', BranchesController).apiOnly()

    // -----------------------------------------------------------------------
    // Members
    // -----------------------------------------------------------------------
    router
      .group(() => {
        router.get('/', [MembersController, 'index']).as('members.index')
        router.post('/', [MembersController, 'store']).as('members.store')
        router.get('/:id', [MembersController, 'show']).as('members.show')
        router.put('/:id', [MembersController, 'update']).as('members.update')
        router.delete('/:id', [MembersController, 'destroy']).as('members.destroy')
        router.get('/:id/stats', [MembersController, 'stats']).as('members.stats')
        router.get('/:id/attendance', [AttendanceController, 'memberHistory']).as('members.attendance')
        router.get('/:id/subscriptions', [MembershipsController, 'memberHistory']).as('members.subscriptions')
      })
      .prefix('/members')
      .use(middleware.rbac(['gym_owner', 'staff', 'trainer']))

    // -----------------------------------------------------------------------
    // Memberships
    // -----------------------------------------------------------------------
    router
      .group(() => {
        router.get('/plans', [MembershipsController, 'listPlans']).as('memberships.plans')
        router.post('/plans', [MembershipsController, 'createPlan']).as('memberships.createPlan').use(middleware.rbac(['gym_owner']))
        router.put('/plans/:id', [MembershipsController, 'updatePlan']).as('memberships.updatePlan').use(middleware.rbac(['gym_owner']))
        router.delete('/plans/:id', [MembershipsController, 'deletePlan']).as('memberships.deletePlan').use(middleware.rbac(['gym_owner']))
        router.post('/subscribe', [MembershipsController, 'subscribe']).as('memberships.subscribe')
        router.post('/:id/freeze', [MembershipsController, 'freeze']).as('memberships.freeze')
        router.post('/:id/unfreeze', [MembershipsController, 'unfreeze']).as('memberships.unfreeze')
        router.post('/:id/cancel', [MembershipsController, 'cancel']).as('memberships.cancel')
        router.get('/expiring', [MembershipsController, 'expiring']).as('memberships.expiring')
      })
      .prefix('/memberships')
      .use(middleware.rbac(['gym_owner', 'staff']))

    // -----------------------------------------------------------------------
    // Payments
    // -----------------------------------------------------------------------
    router
      .group(() => {
        router.post('/order', [PaymentsController, 'createOrder']).as('payments.createOrder')
        router.post('/verify', [PaymentsController, 'verifyPayment']).as('payments.verify')
        router.post('/offline', [PaymentsController, 'recordOfflinePayment']).as('payments.offline').use(middleware.rbac(['gym_owner', 'staff']))
        router.get('/transactions', [PaymentsController, 'listTransactions']).as('payments.transactions').use(middleware.rbac(['gym_owner', 'staff']))
        router.get('/invoices', [PaymentsController, 'listInvoices']).as('payments.invoices')
        router.get('/invoices/:id/download', [PaymentsController, 'downloadInvoice']).as('payments.invoice.download')
      })
      .prefix('/payments')

    // -----------------------------------------------------------------------
    // Attendance
    // -----------------------------------------------------------------------
    router
      .group(() => {
        router.post('/qr-checkin', [AttendanceController, 'qrCheckIn']).as('attendance.qrCheckIn')
        router.post('/manual', [AttendanceController, 'manualCheckIn']).as('attendance.manual').use(middleware.rbac(['gym_owner', 'staff', 'trainer']))
        router.get('/today', [AttendanceController, 'today']).as('attendance.today').use(middleware.rbac(['gym_owner', 'staff']))
        router.get('/report', [AttendanceController, 'monthlyReport']).as('attendance.report').use(middleware.rbac(['gym_owner', 'staff']))
        router.get('/qr', [AttendanceController, 'getBranchQr']).as('attendance.qr')
      })
      .prefix('/attendance')

    // -----------------------------------------------------------------------
    // Exercises
    // -----------------------------------------------------------------------
    router
      .group(() => {
        router.get('/', [WorkoutsController, 'listExercises']).as('exercises.index')
        router.post('/', [WorkoutsController, 'createExercise']).as('exercises.store').use(middleware.rbac(['gym_owner', 'trainer']))
      })
      .prefix('/exercises')

    // -----------------------------------------------------------------------
    // Workout Plans
    // -----------------------------------------------------------------------
    router
      .group(() => {
        router.get('/', [WorkoutsController, 'listPlans']).as('workouts.index')
        router.post('/', [WorkoutsController, 'createPlan']).as('workouts.store').use(middleware.rbac(['gym_owner', 'trainer']))
        router.get('/:id', [WorkoutsController, 'getPlan']).as('workouts.show')
        router.put('/:id', [WorkoutsController, 'updatePlan']).as('workouts.update').use(middleware.rbac(['gym_owner', 'trainer']))
        router.delete('/:id', [WorkoutsController, 'deletePlan']).as('workouts.destroy').use(middleware.rbac(['gym_owner', 'trainer']))
        router.post('/assign', [WorkoutsController, 'assignPlan']).as('workouts.assign').use(middleware.rbac(['gym_owner', 'staff', 'trainer']))
        router.get('/member/:memberId', [WorkoutsController, 'getMemberAssignment']).as('workouts.member')
        router.post('/log', [WorkoutsController, 'logWorkout']).as('workouts.log')
        router.get('/logs/:memberId', [WorkoutsController, 'getMemberLogs']).as('workouts.logs').use(middleware.rbac(['gym_owner', 'staff', 'trainer']))
      })
      .prefix('/workouts')

    // -----------------------------------------------------------------------
    // Diet Plans
    // -----------------------------------------------------------------------
    router
      .group(() => {
        router.get('/', [DietController, 'listPlans']).as('diet.index')
        router.post('/', [DietController, 'createPlan']).as('diet.store').use(middleware.rbac(['gym_owner', 'trainer']))
        router.get('/:id', [DietController, 'getPlan']).as('diet.show')
        router.put('/:id', [DietController, 'updatePlan']).as('diet.update').use(middleware.rbac(['gym_owner', 'trainer']))
        router.delete('/:id', [DietController, 'deletePlan']).as('diet.destroy').use(middleware.rbac(['gym_owner', 'trainer']))
        router.post('/assign', [DietController, 'assignPlan']).as('diet.assign').use(middleware.rbac(['gym_owner', 'staff', 'trainer']))
        router.get('/member/:memberId', [DietController, 'getMemberAssignment']).as('diet.member')
      })
      .prefix('/diet')

    // -----------------------------------------------------------------------
    // Trainers
    // -----------------------------------------------------------------------
    router
      .group(() => {
        router.get('/', [TrainersController, 'index']).as('trainers.index')
        router.post('/', [TrainersController, 'invite']).as('trainers.invite').use(middleware.rbac(['gym_owner']))
        router.get('/:id', [TrainersController, 'show']).as('trainers.show')
        router.put('/:id', [TrainersController, 'update']).as('trainers.update').use(middleware.rbac(['gym_owner']))
        router.delete('/:id', [TrainersController, 'remove']).as('trainers.destroy').use(middleware.rbac(['gym_owner']))
        router.get('/:id/members', [TrainersController, 'members']).as('trainers.members')
      })
      .prefix('/trainers')
      .use(middleware.rbac(['gym_owner', 'staff', 'trainer']))

    // -----------------------------------------------------------------------
    // PT Sessions
    // -----------------------------------------------------------------------
    router
      .group(() => {
        router.get('/packages', [PtController, 'listPackages']).as('pt.packages')
        router.post('/packages', [PtController, 'createPackage']).as('pt.createPackage').use(middleware.rbac(['gym_owner']))
        router.put('/packages/:id', [PtController, 'updatePackage']).as('pt.updatePackage').use(middleware.rbac(['gym_owner']))
        router.get('/bookings', [PtController, 'listBookings']).as('pt.bookings')
        router.post('/book', [PtController, 'bookSession']).as('pt.book')
        router.patch('/bookings/:id', [PtController, 'updateBooking']).as('pt.updateBooking')
        router.get('/trainer/:trainerId/schedule', [PtController, 'trainerSchedule']).as('pt.trainerSchedule')
      })
      .prefix('/pt')

    // -----------------------------------------------------------------------
    // Notifications
    // -----------------------------------------------------------------------
    router
      .group(() => {
        router.get('/', [NotificationsController, 'index']).as('notifications.index')
        router.post('/broadcast', [NotificationsController, 'broadcast']).as('notifications.broadcast').use(middleware.rbac(['gym_owner']))
        router.post('/read-all', [NotificationsController, 'markAllRead']).as('notifications.readAll')
        router.post('/device-token', [NotificationsController, 'registerToken']).as('notifications.registerToken')
      })
      .prefix('/notifications')

    // -----------------------------------------------------------------------
    // Analytics
    // -----------------------------------------------------------------------
    router
      .group(() => {
        router.get('/dashboard', [AnalyticsController, 'dashboard']).as('analytics.dashboard')
        router.get('/revenue', [AnalyticsController, 'revenue']).as('analytics.revenue')
        router.get('/members', [AnalyticsController, 'memberGrowth']).as('analytics.members')
        router.get('/attendance', [AnalyticsController, 'attendance']).as('analytics.attendance')
      })
      .prefix('/analytics')
      .use(middleware.rbac(['gym_owner', 'staff']))
  })
  .prefix('/api/v1/gyms/:gymId')
  .use([middleware.auth(), middleware.tenant()])
