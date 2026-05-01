import { defineConfig } from '@adonisjs/http-server'
import env from '#start/env'

export default {
  appKey: env.get('APP_KEY'),
  http: defineConfig({
    generateRequestId: true,
    allowMethodSpoofing: false,
    trustProxy: 'loopback',
    cookie: {
      maxAge: '2h',
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'lax' as const,
    },
  }),
}
