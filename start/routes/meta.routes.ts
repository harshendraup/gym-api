import router from '@adonisjs/core/services/router'

const MetaController = () => import('#controllers/meta/meta.controller')

// Public — no auth required, called on every app launch
router
  .post('/api/v1/meta', [MetaController, 'show'])
  .as('meta.show')
