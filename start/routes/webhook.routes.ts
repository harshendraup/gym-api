import router from '@adonisjs/core/services/router'

const PaymentsController = () => import('#controllers/payments/payments.controller')

/**
 * Webhook routes — NO authentication middleware.
 * Security is handled via signature verification inside each handler.
 */
router
  .group(() => {
    router.post('/razorpay', [PaymentsController, 'webhook']).as('webhooks.razorpay')
  })
  .prefix('/api/v1/webhooks')
