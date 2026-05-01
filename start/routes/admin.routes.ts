import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'
import { rbac } from '#middleware/rbac.middleware'

const AdminGymsController = () => import('#controllers/admin/admin_gyms.controller')
const AdminUsersController = () => import('#controllers/admin/admin_users.controller')
const AdminAnalyticsController = () => import('#controllers/admin/admin_analytics.controller')

router
  .group(() => {
    router.get('/gyms', [AdminGymsController, 'index']).as('admin.gyms.index')
    router.get('/gyms/:id', [AdminGymsController, 'show']).as('admin.gyms.show')
    router.put('/gyms/:id/status', [AdminGymsController, 'updateStatus']).as('admin.gyms.status')
    router.put('/gyms/:id/verify', [AdminGymsController, 'verify']).as('admin.gyms.verify')

    router.get('/users', [AdminUsersController, 'index']).as('admin.users.index')
    router.get('/users/stats', [AdminUsersController, 'stats']).as('admin.users.stats')
    router.get('/users/:id', [AdminUsersController, 'show']).as('admin.users.show')
    router.post('/users/:id/suspend', [AdminUsersController, 'suspend']).as('admin.users.suspend')
    router.post('/users/:id/unsuspend', [AdminUsersController, 'unsuspend']).as('admin.users.unsuspend')

    router.get('/analytics/platform', [AdminAnalyticsController, 'platform']).as('admin.analytics')
    router.get('/analytics/revenue', [AdminAnalyticsController, 'revenue']).as('admin.revenue')
  })
  .prefix('/api/v1/admin')
  .use([middleware.auth(), rbac(['super_admin'])])
