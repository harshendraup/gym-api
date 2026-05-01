import env from '#start/env'
import { defineConfig } from '@adonisjs/cors'

const corsConfig = defineConfig({
  enabled: true,
  origin: [
    env.get('ADMIN_URL', 'http://localhost:5173'),
    /gymos\.in$/,
  ],
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'],
  headers: true,
  exposeHeaders: [],
  credentials: true,
  maxAge: 90,
})

export default corsConfig
