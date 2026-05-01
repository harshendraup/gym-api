import { Env } from '@adonisjs/core/env'

export default await Env.create(new URL('../', import.meta.url), {
  NODE_ENV: Env.schema.enum(['development', 'production', 'test'] as const),
  PORT: Env.schema.number(),
  APP_KEY: Env.schema.string(),
  HOST: Env.schema.string({ format: 'host' }),
  LOG_LEVEL: Env.schema.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']),

  DB_HOST: Env.schema.string({ format: 'host' }),
  DB_PORT: Env.schema.number(),
  DB_USER: Env.schema.string(),
  DB_PASSWORD: Env.schema.string.optional(),
  DB_DATABASE: Env.schema.string(),

  REDIS_HOST: Env.schema.string({ format: 'host' }),
  REDIS_PORT: Env.schema.number(),
  REDIS_PASSWORD: Env.schema.string.optional(),

  JWT_SECRET: Env.schema.string.optional(),
  JWT_EXPIRY: Env.schema.string.optional(),
  REFRESH_TOKEN_EXPIRY: Env.schema.string.optional(),

  ADMIN_URL: Env.schema.string.optional(),

  MSG91_API_KEY: Env.schema.string.optional(),
  MSG91_SENDER_ID: Env.schema.string.optional(),
  MSG91_TEMPLATE_ID: Env.schema.string.optional(),

  RAZORPAY_KEY_ID: Env.schema.string.optional(),
  RAZORPAY_KEY_SECRET: Env.schema.string.optional(),
  RAZORPAY_WEBHOOK_SECRET: Env.schema.string.optional(),

  FIREBASE_PROJECT_ID: Env.schema.string.optional(),
  FIREBASE_PRIVATE_KEY: Env.schema.string.optional(),
  FIREBASE_CLIENT_EMAIL: Env.schema.string.optional(),

  S3_ENDPOINT: Env.schema.string.optional(),
  S3_REGION: Env.schema.string.optional(),
  S3_BUCKET: Env.schema.string.optional(),
  S3_ACCESS_KEY: Env.schema.string.optional(),
  S3_SECRET_KEY: Env.schema.string.optional(),
  S3_PUBLIC_URL: Env.schema.string.optional(),

  RESEND_API_KEY: Env.schema.string.optional(),
  MAIL_FROM_ADDRESS: Env.schema.string.optional(),
  MAIL_FROM_NAME: Env.schema.string.optional(),
})
