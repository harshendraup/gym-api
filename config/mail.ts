import env from '#start/env'
import { defineConfig, transports } from '@adonisjs/mail'

const mailConfig = defineConfig({
  default: 'resend',
  mailers: {
    resend: transports.resend({
      key: env.get('RESEND_API_KEY', ''),
      baseUrl: 'https://api.resend.com',
    }),
  },
  from: {
    address: env.get('MAIL_FROM_ADDRESS', 'noreply@gymos.in'),
    name: env.get('MAIL_FROM_NAME', 'GymOS'),
  },
})

export default mailConfig

declare module '@adonisjs/mail/types' {
  export interface MailersList extends InferMailers<typeof mailConfig> {}
}
