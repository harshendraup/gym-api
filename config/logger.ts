import env from '#start/env'
import { defineConfig } from '@adonisjs/core/logger'

const isDev = env.get('NODE_ENV') === 'development'

const loggerConfig = defineConfig({
  default: 'app',
  loggers: {
    app: {
      enabled: true,
      name: 'gymos',
      level: env.get('LOG_LEVEL', 'info'),
      transport: isDev
        ? {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'HH:MM:ss',
              ignore: 'pid,hostname,name',
              messageFormat: '{msg}',
              singleLine: false,
            },
          }
        : undefined,
    },
  },
})

export default loggerConfig

declare module '@adonisjs/core/types' {
  export interface LoggersList extends InferLoggers<typeof loggerConfig> {}
}
