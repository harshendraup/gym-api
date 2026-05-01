import Razorpay from 'razorpay'
import crypto from 'node:crypto'
import db from '@adonisjs/lucid/services/db'
import emitter from '@adonisjs/core/services/emitter'
import logger from '@adonisjs/core/services/logger'
import env from '#start/env'
import PaymentOrder from '#models/payment_order.model'
import PaymentTransaction from '#models/payment_transaction.model'
import { MembershipService } from './membership.service.js'
import { InvoiceService } from './invoice.service.js'
import { nanoid } from 'nanoid'

interface CreateOrderInput {
  gymId: string
  gymMemberId: string
  subscriptionId: string
  amount: number                   // in paise
  description?: string
  notes?: Record<string, string>
}

interface VerifyPaymentInput {
  razorpayOrderId: string
  razorpayPaymentId: string
  razorpaySignature: string
}

interface WebhookPayload {
  event: string
  payload: {
    payment?: { entity: Record<string, unknown> }
    order?: { entity: Record<string, unknown> }
  }
}

export class PaymentService {
  private razorpay: Razorpay
  private membershipService = new MembershipService()
  private invoiceService = new InvoiceService()

  constructor() {
    this.razorpay = new Razorpay({
      key_id: env.get('RAZORPAY_KEY_ID'),
      key_secret: env.get('RAZORPAY_KEY_SECRET'),
    })
  }

  // -------------------------------------------------------------------------
  // Create Order
  // -------------------------------------------------------------------------

  async createOrder(input: CreateOrderInput): Promise<PaymentOrder> {
    const idempotencyKey = nanoid(32)

    const rzpOrder = await this.razorpay.orders.create({
      amount: input.amount,
      currency: 'INR',
      receipt: idempotencyKey,
      notes: {
        gym_id: input.gymId,
        member_id: input.gymMemberId,
        subscription_id: input.subscriptionId,
        ...input.notes,
      },
    })

    return PaymentOrder.create({
      gymId: input.gymId,
      gymMemberId: input.gymMemberId,
      subscriptionId: input.subscriptionId,
      razorpayOrderId: rzpOrder.id,
      idempotencyKey,
      amount: input.amount,
      amountPaid: 0,
      amountDue: input.amount,
      currency: 'INR',
      status: 'created',
      orderType: 'membership',
      description: input.description ?? 'Membership renewal',
    })
  }

  // -------------------------------------------------------------------------
  // Verify Client-Side Payment (mobile/web callback)
  // -------------------------------------------------------------------------

  async verifyAndCapturePayment(input: VerifyPaymentInput): Promise<void> {
    const isValid = this.verifySignature(
      input.razorpayOrderId,
      input.razorpayPaymentId,
      input.razorpaySignature
    )

    if (!isValid) {
      throw new Error('PAYMENT_SIGNATURE_INVALID')
    }

    const order = await PaymentOrder.findByOrFail('razorpay_order_id', input.razorpayOrderId)

    await this.processSuccessfulPayment(order, input.razorpayPaymentId, input.razorpaySignature)
  }

  // -------------------------------------------------------------------------
  // Webhook Handler (idempotent — safe to call multiple times)
  // -------------------------------------------------------------------------

  async handleWebhook(rawBody: string, signature: string): Promise<void> {
    this.verifyWebhookSignature(rawBody, signature)

    const event = JSON.parse(rawBody) as WebhookPayload

    switch (event.event) {
      case 'payment.captured': {
        const payment = event.payload.payment!.entity
        const orderId = payment['order_id'] as string
        const paymentId = payment['id'] as string

        const order = await PaymentOrder.findBy('razorpay_order_id', orderId)
        if (!order) {
          logger.warn({ orderId }, 'Webhook received for unknown order — skipping')
          return
        }

        // Idempotent: skip if already processed
        if (order.status === 'paid') return

        await this.processSuccessfulPayment(order, paymentId, null, payment)
        break
      }

      case 'payment.failed': {
        const payment = event.payload.payment!.entity
        const orderId = payment['order_id'] as string

        await PaymentOrder.query()
          .where('razorpay_order_id', orderId)
          .update({ status: 'failed' })

        emitter.emit('payment:failed', { orderId })
        break
      }
    }
  }

  // -------------------------------------------------------------------------
  // Offline / Cash Payment
  // -------------------------------------------------------------------------

  async recordOfflinePayment(input: {
    gymId: string
    gymMemberId: string
    subscriptionId: string
    amount: number
    method: 'cash' | 'upi' | 'card' | 'cheque'
    referenceNumber?: string
    recordedBy: string
  }): Promise<PaymentOrder> {
    return db.transaction(async (trx) => {
      const idempotencyKey = nanoid(32)

      const order = await PaymentOrder.create(
        {
          gymId: input.gymId,
          gymMemberId: input.gymMemberId,
          subscriptionId: input.subscriptionId,
          idempotencyKey,
          amount: input.amount,
          amountPaid: input.amount,
          amountDue: 0,
          status: 'paid',
          orderType: 'membership',
          description: `Offline ${input.method} payment`,
        },
        { client: trx }
      )

      await PaymentTransaction.create(
        {
          gymId: input.gymId,
          paymentOrderId: order.id,
          gymMemberId: input.gymMemberId,
          amount: input.amount,
          currency: 'INR',
          status: 'captured',
          method: input.method,
          capturedAt: new Date().toISOString() as unknown as Date,
        },
        { client: trx }
      )

      return order
    })
  }

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  private async processSuccessfulPayment(
    order: PaymentOrder,
    paymentId: string,
    signature: string | null,
    gatewayResponse: Record<string, unknown> = {}
  ): Promise<void> {
    await db.transaction(async (trx) => {
      order.useTransaction(trx)
      order.status = 'paid'
      order.amountPaid = order.amount
      order.amountDue = 0
      await order.save()

      await PaymentTransaction.create(
        {
          gymId: order.gymId,
          paymentOrderId: order.id,
          gymMemberId: order.gymMemberId,
          razorpayPaymentId: paymentId,
          razorpaySignature: signature ?? undefined,
          amount: order.amount,
          currency: 'INR',
          status: 'captured',
          method: (gatewayResponse['method'] as string) ?? 'other',
          gatewayResponse,
          capturedAt: new Date().toISOString() as unknown as Date,
        },
        { client: trx }
      )

      if (order.subscriptionId) {
        await this.membershipService.activateAfterPayment(order.subscriptionId, order.gymId)
      }

      emitter.emit('payment:captured', { order })
    })

    // Invoice generation happens async — outside transaction
    if (order.subscriptionId) {
      await this.invoiceService.generateForSubscription(order.id)
    }
  }

  private verifySignature(orderId: string, paymentId: string, signature: string): boolean {
    const body = `${orderId}|${paymentId}`
    const expected = crypto
      .createHmac('sha256', env.get('RAZORPAY_KEY_SECRET'))
      .update(body)
      .digest('hex')
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  }

  private verifyWebhookSignature(rawBody: string, signature: string): void {
    const expected = crypto
      .createHmac('sha256', env.get('RAZORPAY_WEBHOOK_SECRET'))
      .update(rawBody)
      .digest('hex')

    const isValid = crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
    if (!isValid) throw new Error('WEBHOOK_SIGNATURE_INVALID')
  }
}
