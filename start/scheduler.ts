/**
 * Cron scheduler using BullMQ repeatable jobs.
 * These jobs run on the worker process, not the HTTP process.
 */
import { Queue } from 'bullmq'
import redis from '@adonisjs/redis/services/main'
import logger from '@adonisjs/core/services/logger'

const schedulerQueue = new Queue('scheduler', {
  connection: redis.ioRedisClient,
})

export async function registerScheduledJobs() {
  // Process membership expiries — every day at 1 AM
  await schedulerQueue.add(
    'process-membership-expiries',
    {},
    {
      repeat: { pattern: '0 1 * * *' },
      jobId: 'membership-expiry-daily',
    }
  )

  // Send expiry reminders — every day at 9 AM
  await schedulerQueue.add(
    'send-expiry-reminders',
    { daysAhead: 7 },
    {
      repeat: { pattern: '0 9 * * *' },
      jobId: 'expiry-reminders-7day',
    }
  )

  // Send expiry reminders — 3 day warning
  await schedulerQueue.add(
    'send-expiry-reminders',
    { daysAhead: 3 },
    {
      repeat: { pattern: '0 9 * * *' },
      jobId: 'expiry-reminders-3day',
    }
  )

  // Unfreeze expired freezes — every hour
  await schedulerQueue.add(
    'unfreeze-expired-memberships',
    {},
    {
      repeat: { pattern: '0 * * * *' },
      jobId: 'unfreeze-hourly',
    }
  )

  // Cleanup stale payment orders — every 6 hours
  await schedulerQueue.add(
    'cleanup-stale-orders',
    {},
    {
      repeat: { pattern: '0 */6 * * *' },
      jobId: 'cleanup-stale-orders',
    }
  )

  logger.info('Scheduled jobs registered')
}

registerScheduledJobs()
