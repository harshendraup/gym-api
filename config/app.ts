import env from '#start/env'

export default {
  appKey: env.get('APP_KEY'),
  http: {
    generateRequestId: true,
    allowMethodSpoofing: false,
    cookie: {
      maxAge: '2h',
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'lax' as const,
    },
  },
}
