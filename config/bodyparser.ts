import { defineConfig } from '@adonisjs/core/bodyparser'

const bodyParserConfig = defineConfig({
  allowedMethods: ['POST', 'PUT', 'PATCH', 'DELETE'],

  form: {
    enabled: true,
    limit: '1mb',
    encoding: 'utf-8',
    convertEmptyStringsToNull: true,
    types: ['application/x-www-form-urlencoded'],
  },

  json: {
    enabled: true,
    limit: '1mb',
    strict: true,
    convertEmptyStringsToNull: true,
    types: [
      'application/json',
      'application/json-patch+json',
      'application/vnd.api+json',
      'application/csp-report',
    ],
  },

  multipart: {
    autoProcess: true,
    processManually: [],
    enabled: true,
    maxFields: 1000,
    limit: '20mb',
    types: ['multipart/form-data'],
  },

  raw: {
    enabled: true,
    limit: '1mb',
    types: ['text/*'],
  },
})

export default bodyParserConfig
