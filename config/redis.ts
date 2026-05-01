import env from '#start/env'
import { defineConfig } from '@adonisjs/redis'

const redisConfig = defineConfig({
  connection: 'main',
  connections: {
    main: {
      host: env.get('REDIS_HOST'),
      port: env.get('REDIS_PORT'),
      password: env.get('REDIS_PASSWORD', ''),
      db: 0,
      keyPrefix: 'gymos:',
      retryStrategy(times: number) {
        return Math.min(times * 50, 2000)
      },
    },
  },
})

export default redisConfig
