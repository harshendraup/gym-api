import type { HttpContext } from '@adonisjs/core/http'
import { NotificationService } from '#services/notification.service'
import Notification from '#models/notification.model'
import vine from '@vinejs/vine'

const broadcastValidator = vine.compile(
  vine.object({
    title: vine.string().trim().minLength(3).maxLength(150),
    body: vine.string().trim().minLength(5),
    targetAudience: vine.enum(['all', 'active', 'expired', 'trainers']).optional(),
    sendPush: vine.boolean().optional(),
    data: vine.record(vine.string()).optional(),
  })
)

const registerTokenValidator = vine.compile(
  vine.object({
    token: vine.string().trim().minLength(10),
    platform: vine.enum(['ios', 'android', 'web']),
    deviceId: vine.string().trim().optional(),
  })
)

const notificationService = new NotificationService()

export default class NotificationsController {
  async index({ request, response, auth, gymId }: HttpContext) {
    const page = Number(request.qs().page ?? 1)
    const user = auth.getUserOrFail()

    const notifications = await Notification.query()
      .where('user_id', user.id)
      .orderBy('created_at', 'desc')
      .paginate(page, 20)

    const unreadCount = await notificationService.getUnreadCount(user.id)

    return response.ok({
      success: true,
      data: notifications.all().map((n) => n.serialize()),
      meta: { ...notifications.getMeta(), unreadCount },
    })
  }

  async broadcast({ request, response, gymId }: HttpContext) {
    const payload = await request.validateUsing(broadcastValidator)

    await notificationService.broadcast({
      gymId,
      type: 'announcement',
      title: payload.title,
      body: payload.body,
      data: payload.data as Record<string, string>,
    })

    return response.ok({ success: true, data: { message: 'Broadcast queued successfully' } })
  }

  async markAllRead({ response, auth }: HttpContext) {
    await notificationService.markAllRead(auth.getUserOrFail().id)
    return response.ok({ success: true, data: { message: 'All notifications marked as read' } })
  }

  async registerToken({ request, response, auth }: HttpContext) {
    const payload = await request.validateUsing(registerTokenValidator)
    await notificationService.registerDeviceToken(
      auth.getUserOrFail().id,
      payload.token,
      payload.platform,
      payload.deviceId
    )
    return response.ok({ success: true, data: { message: 'Device token registered' } })
  }
}
