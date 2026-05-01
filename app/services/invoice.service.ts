import db from '@adonisjs/lucid/services/db'
import Invoice from '#models/invoice.model'
import PaymentOrder from '#models/payment_order.model'
import { DateTime } from 'luxon'

export class InvoiceService {
  async generateForSubscription(paymentOrderId: string): Promise<Invoice> {
    const order = await PaymentOrder.query()
      .where('id', paymentOrderId)
      .preload('gymMember', (q) => q.preload('user'))
      .firstOrFail()

    // Fetch gym and plan details
    const [gym, subscription] = await Promise.all([
      db.from('gyms').where('id', order.gymId).select('name', 'address_line1', 'city', 'state', 'pincode', 'phone', 'email').first(),
      order.subscriptionId
        ? db.from('member_subscriptions as ms')
            .join('membership_plans as mp', 'mp.id', 'ms.membership_plan_id')
            .where('ms.id', order.subscriptionId)
            .select('mp.name as plan_name', 'ms.starts_at', 'ms.expires_at', 'ms.amount_paid', 'ms.discount_applied')
            .first()
        : null,
    ])

    const invoiceNumber = await this.generateInvoiceNumber(order.gymId)

    const lineItems = subscription
      ? [
          {
            name: `${subscription.plan_name} Membership`,
            description: `${subscription.starts_at} to ${subscription.expires_at}`,
            qty: 1,
            rate: order.amount + (subscription.discount_applied ?? 0),
            discount: subscription.discount_applied ?? 0,
            amount: order.amount,
          },
        ]
      : [{ name: order.description ?? 'Service', qty: 1, rate: order.amount, amount: order.amount }]

    const gymSnapshot = {
      name: gym?.name,
      address: [gym?.address_line1, gym?.city, gym?.state, gym?.pincode].filter(Boolean).join(', '),
      phone: gym?.phone,
      email: gym?.email,
    }

    const memberSnapshot = {
      name: order.gymMember?.user?.fullName,
      phone: order.gymMember?.user?.phone,
      email: order.gymMember?.user?.email,
    }

    return Invoice.create({
      gymId: order.gymId,
      gymMemberId: order.gymMemberId,
      paymentOrderId: order.id,
      invoiceNumber,
      subtotal: order.amount + (subscription?.discount_applied ?? 0),
      discount: subscription?.discount_applied ?? 0,
      tax: 0,
      total: order.amount,
      currency: 'INR',
      lineItems,
      gymSnapshot,
      memberSnapshot,
      status: 'paid',
    })
  }

  private async generateInvoiceNumber(gymId: string): Promise<string> {
    const gymCode = await db
      .from('gyms')
      .where('id', gymId)
      .pluck('gym_code')
      .then((rows) => rows[0] ?? 'GYM')

    const year = DateTime.now().toFormat('yyyy')
    const month = DateTime.now().toFormat('MM')

    const count = await db
      .from('invoices')
      .where('gym_id', gymId)
      .whereRaw(`EXTRACT(YEAR FROM created_at) = ?`, [year])
      .whereRaw(`EXTRACT(MONTH FROM created_at) = ?`, [month])
      .count('* as total')
      .first()

    const seq = String(Number(count?.total ?? 0) + 1).padStart(4, '0')
    return `INV-${gymCode}-${year}${month}-${seq}`
  }
}
