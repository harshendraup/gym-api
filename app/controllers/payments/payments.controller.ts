import type { HttpContext } from '@adonisjs/core/http'
import { PaymentService } from '#services/payment.service'
import {
  createOrderValidator,
  verifyPaymentValidator,
  offlinePaymentValidator,
} from '#validators/payment.validator'

const paymentService = new PaymentService()

export default class PaymentsController {
  /**
   * POST /api/v1/gyms/:gymId/payments/order
   * Create Razorpay order (called before showing payment sheet on mobile)
   */
  async createOrder({ request, response, gymId }: HttpContext) {
    const payload = await request.validateUsing(createOrderValidator)

    const order = await paymentService.createOrder({
      gymId,
      gymMemberId: payload.gymMemberId,
      subscriptionId: payload.subscriptionId,
      amount: payload.amount,
      description: payload.description,
    })

    return response.created({
      success: true,
      data: {
        orderId: order.id,
        razorpayOrderId: order.razorpayOrderId,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
      },
    })
  }

  /**
   * POST /api/v1/gyms/:gymId/payments/verify
   * Verify payment signature after mobile SDK callback
   */
  async verifyPayment({ request, response }: HttpContext) {
    const payload = await request.validateUsing(verifyPaymentValidator)

    await paymentService.verifyAndCapturePayment({
      razorpayOrderId: payload.razorpayOrderId,
      razorpayPaymentId: payload.razorpayPaymentId,
      razorpaySignature: payload.razorpaySignature,
    })

    return response.ok({
      success: true,
      data: { message: 'Payment verified and membership activated' },
    })
  }

  /**
   * POST /api/v1/gyms/:gymId/payments/offline
   * Record cash/card/UPI payment (staff/owner only)
   */
  async recordOfflinePayment({ request, response, gymId, auth }: HttpContext) {
    const payload = await request.validateUsing(offlinePaymentValidator)

    const order = await paymentService.recordOfflinePayment({
      gymId,
      gymMemberId: payload.gymMemberId,
      subscriptionId: payload.subscriptionId,
      amount: payload.amount,
      method: payload.method,
      referenceNumber: payload.referenceNumber,
      recordedBy: auth.getUserOrFail().id,
    })

    return response.created({ success: true, data: order.serialize() })
  }

  /**
   * POST /api/v1/webhooks/razorpay
   * Razorpay webhook — NO auth middleware on this route
   */
  async webhook({ request, response }: HttpContext) {
    const rawBody = request.raw() ?? ''
    const signature = request.header('x-razorpay-signature') ?? ''

    try {
      await paymentService.handleWebhook(rawBody, signature)
      return response.ok({ received: true })
    } catch (error: any) {
      if (error.message === 'WEBHOOK_SIGNATURE_INVALID') {
        return response.unauthorized({ error: 'Invalid signature' })
      }
      throw error
    }
  }
}
