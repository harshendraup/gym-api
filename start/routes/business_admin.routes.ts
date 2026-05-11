import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const BusinessUsersController = () => import('#controllers/business/business_users.controller')
const BusinessProfileController = () => import('#controllers/business/business_profile.controller')
const BusinessMembershipsController = () => import('#controllers/business/business_memberships.controller')

router
  .group(() => {
    router.get('/overview', [BusinessProfileController, 'myOverview']).as('business.profile.myOverview')
    router.get('/businesses/:id', [BusinessProfileController, 'showById']).as('business.profile.showById')
    router.get('/businesses/:id/overview', [BusinessProfileController, 'overviewById']).as('business.profile.overviewById')
    router.get('/businesses/:businessId/memberships/plans', [BusinessMembershipsController, 'listPlans']).as('business.memberships.plans')
    router.get('/businesses/:businessId/memberships/plans/:id', [BusinessMembershipsController, 'showPlan']).as('business.memberships.showPlan')
    router.post('/businesses/:businessId/memberships/plans', [BusinessMembershipsController, 'createPlan']).as('business.memberships.createPlan')
    router.put('/businesses/:businessId/memberships/plans/:id', [BusinessMembershipsController, 'updatePlan']).as('business.memberships.updatePlan')
    router.delete('/businesses/:businessId/memberships/plans/:id', [BusinessMembershipsController, 'deletePlan']).as('business.memberships.deletePlan')
    router.get('/users', [BusinessUsersController, 'index']).as('business.users.index')
    router.post('/users', [BusinessUsersController, 'store']).as('business.users.store')
    router.put('/users/:id', [BusinessUsersController, 'update']).as('business.users.update')
    router.delete('/users/:id', [BusinessUsersController, 'destroy']).as('business.users.destroy')
  })
  .prefix('/api/v1/business-admin')
  .use([middleware.auth(), middleware.rbac(['admin', 'manager'])])
