import { defineConfig } from '@adonisjs/core/app'

export default defineConfig({
  /*
  |--------------------------------------------------------------------------
  | Commands
  |--------------------------------------------------------------------------
  */
  commands: [
    () => import('@adonisjs/core/commands'),
    () => import('@adonisjs/lucid/commands'),
    () => import('@adonisjs/mail/commands'),
  ],

  /*
  |--------------------------------------------------------------------------
  | Service Providers
  |--------------------------------------------------------------------------
  */
  providers: [
    () => import('@adonisjs/core/providers/app_provider'),
    () => import('@adonisjs/core/providers/hash_provider'),
    {
      file: () => import('@adonisjs/core/providers/repl_provider'),
      environment: ['repl'],
    },
    () => import('@adonisjs/core/providers/vinejs_provider'),
    () => import('@adonisjs/cors/cors_provider'),
    () => import('@adonisjs/lucid/database_provider'),
    () => import('@adonisjs/auth/auth_provider'),
    () => import('@adonisjs/redis/redis_provider'),
    () => import('@adonisjs/mail/mail_provider'),
    () => import('@adonisjs/static/static_provider'),
    () => import('@adonisjs/bouncer/bouncer_provider'),
  ],

  /*
  |--------------------------------------------------------------------------
  | Preloads
  |--------------------------------------------------------------------------
  */
  preloads: [
    () => import('#start/routes'),
    () => import('#start/kernel'),
    () => import('#start/events'),
    () => import('#start/scheduler'),
  ],

  /*
  |--------------------------------------------------------------------------
  | Path Aliases
  |--------------------------------------------------------------------------
  */
  directories: {
    config: 'config',
    commands: 'app/commands',
    contracts: 'contracts',
    migrations: 'database/migrations',
    seeders: 'database/seeders',
    factories: 'database/factories',
  },

  /*
  |--------------------------------------------------------------------------
  | Metafiles
  |--------------------------------------------------------------------------
  */
  metaFiles: [
    {
      pattern: 'public/**',
      reloadServer: false,
    },
    {
      pattern: 'resources/views/**/*.edge',
      reloadServer: false,
    },
  ],

  assetsBundler: false,

  unstable_assembler: {
    nodeArgs: ['--import', 'tsx/esm'],
  },
})
