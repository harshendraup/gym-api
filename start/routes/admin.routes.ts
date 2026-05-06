import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const AdminGymsController = () => import('#controllers/admin/admin_gyms.controller')
const AdminUsersController = () => import('#controllers/admin/admin_users.controller')
const AdminAnalyticsController = () => import('#controllers/admin/admin_analytics.controller')
const AdminBusinessesController = () => import('#controllers/admin/admin_businesses.controller')
const AdminBusinessAdminsController = () => import('#controllers/admin/admin_business_admins.controller')
const MetaController = () => import('#controllers/meta/meta.controller')

router
  .group(() => {
    router.get('/gyms', [AdminGymsController, 'index']).as('admin.gyms.index')
    router.post('/gyms', [AdminGymsController, 'store']).as('admin.gyms.store')
    router.get('/gyms/:id', [AdminGymsController, 'show']).as('admin.gyms.show')
    router.put('/gyms/:id/status', [AdminGymsController, 'updateStatus']).as('admin.gyms.status')
    router.put('/gyms/:id/verify', [AdminGymsController, 'verify']).as('admin.gyms.verify')

    router.get('/users', [AdminUsersController, 'index']).as('admin.users.index')
    router.get('/users/stats', [AdminUsersController, 'stats']).as('admin.users.stats')
    router.get('/users/:id', [AdminUsersController, 'show']).as('admin.users.show')
    router.post('/users/:id/suspend', [AdminUsersController, 'suspend']).as('admin.users.suspend')
    router.post('/users/:id/unsuspend', [AdminUsersController, 'unsuspend']).as('admin.users.unsuspend')

    router.get('/gym-owners', [AdminUsersController, 'listGymOwners']).as('admin.gymOwners.index')
    router.post('/gym-owners', [AdminUsersController, 'createGymOwner']).as('admin.gymOwners.store')
    router.delete('/gym-owners/:id', [AdminUsersController, 'removeGymOwner']).as('admin.gymOwners.destroy')

    router.get('/analytics/platform', [AdminAnalyticsController, 'platform']).as('admin.analytics')
    router.get('/analytics/revenue', [AdminAnalyticsController, 'revenue']).as('admin.revenue')

    // Businesses
    router.get('/businesses', [AdminBusinessesController, 'index']).as('admin.businesses.index')
    router.post('/businesses', [AdminBusinessesController, 'store']).as('admin.businesses.store')
    router.get('/businesses/:id', [AdminBusinessesController, 'show']).as('admin.businesses.show')
    router.put('/businesses/:id', [AdminBusinessesController, 'update']).as('admin.businesses.update')
    router.put('/businesses/:id/status', [AdminBusinessesController, 'updateStatus']).as('admin.businesses.status')
    router.delete('/businesses/:id', [AdminBusinessesController, 'destroy']).as('admin.businesses.destroy')
    router.get('/businesses/:id/members', [AdminBusinessesController, 'members']).as('admin.businesses.members')

    // Business Admins
    router.get('/business-admins', [AdminBusinessAdminsController, 'index']).as('admin.businessAdmins.index')
    router.post('/business-admins', [AdminBusinessAdminsController, 'store']).as('admin.businessAdmins.store')
    router.get('/business-admins/:id', [AdminBusinessAdminsController, 'show']).as('admin.businessAdmins.show')
    router.put('/business-admins/:id', [AdminBusinessAdminsController, 'update']).as('admin.businessAdmins.update')
    router.delete('/business-admins/:id', [AdminBusinessAdminsController, 'destroy']).as('admin.businessAdmins.destroy')

    // App config — create / update / fetch per gym (busts meta cache on change)
    router.get('/gyms/:gymId/app-config', [MetaController, 'getConfig']).as('admin.gyms.appConfig.show')
    router.put('/gyms/:gymId/app-config', [MetaController, 'upsertConfig']).as('admin.gyms.appConfig.upsert')
  })
  .prefix('/api/v1/admin')
  .use([middleware.auth(), middleware.rbac(['super_admin'])])
