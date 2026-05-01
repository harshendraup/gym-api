import app from '@adonisjs/core/services/app'
import logger from '@adonisjs/core/services/logger'
import DeviceToken from '#models/device_token.model'
import Notification from '#models/notification.model'
import type { NotificationType } from '#models/notification.model'
import { Queue } from 'bullmq'
import redis from '@adonisjs/redis/services/main'

interface SendPushInput {
  userId: string
  gymId?: string
  type: NotificationType
  title: string
  body: string
  data?: Record<string, string>
}

interface BroadcastInput {
  gymId: string
  type: NotificationType
  title: string
  body: string
  data?: Record<string, string>
  targetMemberIds?: string[]   // null = all members
}

export class NotificationService {
  private notificationQueue = new Queue('notifications', {
    connection: redis.ioRedisClient,
  })

  // -------------------------------------------------------------------------
  // Single User Notification
  // -------------------------------------------------------------------------

  async sendToUser(input: SendPushInput): Promise<void> {
    // Store in-app notification first (always)
    await Notification.create({
      gymId: input.gymId ?? null,
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      data: input.data ?? {},
      isRead: false,
      isPushSent: false,
    })

    // Queue push delivery
    await this.notificationQueue.add(
      'send-push',
      { userId: input.userId, title: input.title, body: input.body, data: input.data ?? {} },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } }
    )
  }

  // -------------------------------------------------------------------------
  // Gym-wide Broadcast
  // -------------------------------------------------------------------------

  async broadcast(input: BroadcastInput): Promise<void> {
    await this.notificationQueue.add(
      'broadcast',
      input,
      { attempts: 2, backoff: { type: 'fixed', delay: 10000 } }
    )
  }

  // -------------------------------------------------------------------------
  // Direct FCM Push (called from job worker)
  // -------------------------------------------------------------------------

  async deliverPushToUser(userId: string, title: string, body: string, data: Record<string, string> = {}): Promise<void> {
    const tokens = await DeviceToken.query()
      .where('user_id', userId)
      .where('is_active', true)

    if (!tokens.length) return

    const admin = await this.getFirebaseAdmin()
    const staleTokenIds: string[] = []

    await Promise.allSettled(
      tokens.map(async (deviceToken) => {
        try {
          await admin.messaging().send({
            token: deviceToken.token,
            notification: { title, body },
            data,
            android: { priority: 'high' },
            apns: { headers: { 'apns-priority': '10' } },
          })

          await DeviceToken.query()
            .where('id', deviceToken.id)
            .update({ lastUsedAt: new Date() })
        } catch (error: any) {
          if (
            error.code === 'messaging/registration-token-not-registered' ||
            error.code === 'messaging/invalid-registration-token'
          ) {
            staleTokenIds.push(deviceToken.id)
          } else {
            logger.warn({ error, userId, token: deviceToken.token }, 'FCM push failed')
          }
        }
      })
    )

    if (staleTokenIds.length) {
      await DeviceToken.query()
        .whereIn('id', staleTokenIds)
        .update({ isActive: false })
    }
  }

  async registerDeviceToken(userId: string, token: string, platform: 'ios' | 'android' | 'web', deviceId?: string): Promise<void> {
    await DeviceToken.updateOrCreate(
      { userId, token },
      { platform, deviceId: deviceId ?? null, isActive: true, lastUsedAt: new Date() as unknown as any }
    )
  }

  async unregisterDeviceToken(userId: string, token: string): Promise<void> {
    await DeviceToken.query()
      .where('user_id', userId)
      .where('token', token)
      .update({ isActive: false })
  }

  async getUnreadCount(userId: string): Promise<number> {
    const result = await Notification.query()
      .where('user_id', userId)
      .where('is_read', false)
      .count('* as total')

    return Number(result[0].$extras.total ?? 0)
  }

  async markAllRead(userId: string): Promise<void> {
    await Notification.query()
      .where('user_id', userId)
      .where('is_read', false)
      .update({ isRead: true, readAt: new Date() })
  }

  private async getFirebaseAdmin() {
    const { default: firebaseAdmin } = await import('firebase-admin')
    if (!firebaseAdmin.apps.length) {
      firebaseAdmin.initializeApp({
        credential: firebaseAdmin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        }),
      })
    }
    return firebaseAdmin
  }
}
