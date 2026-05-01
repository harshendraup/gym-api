import { defineConfig } from '@adonisjs/auth'
import { tokensGuard, tokensUserProvider } from '@adonisjs/auth/access_tokens'
import type { Authenticator } from '@adonisjs/auth'
import type { InferAuthenticators } from '@adonisjs/auth/types'

const authConfig = defineConfig({
  default: 'api',
  guards: {
    api: tokensGuard({
      provider: tokensUserProvider({
        tokens: 'accessTokens',
        model: () => import('#models/user.model'),
      }),
    }),
  },
})

export default authConfig

declare module '@adonisjs/core/http' {
  interface HttpContext {
    auth: Authenticator<InferAuthenticators<typeof authConfig>>
  }
}
