import env from '#start/env'
import { defineConfig } from '@adonisjs/cors'

const adminUrls = env
  .get('ADMIN_URL', 'http://localhost:5173,http://localhost:5174')
  .split(',')
  .map((url) => url.trim())
  .filter(Boolean)

const corsConfig = defineConfig({
  enabled: true,
  origin: env.get('NODE_ENV') === 'development'
    ? true
    : [
        ...adminUrls,
        /gymos\.in$/,
      ],
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'],
  headers: true,
  exposeHeaders: [],
  credentials: true,
  maxAge: 90,
})

export default corsConfig
