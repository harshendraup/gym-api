import router from '@adonisjs/core/services/router'

router.get('/', async ({ response }) => {
  return response.ok({
    success: true,
    message: 'GymOS API is running',
  })
})

import '#start/routes/meta.routes'
import '#start/routes/auth.routes'
import '#start/routes/gym.routes'
import '#start/routes/admin.routes'
import '#start/routes/webhook.routes'
