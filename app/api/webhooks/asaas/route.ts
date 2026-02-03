import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { UserPlan } from '../../../../types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('[Asaas Webhook Received]:', body.event);

    const { event, payment, subscription } = body;

    // Unified Payment Event Handler
    if (event.startsWith('PAYMENT_')) {
      const asaasPaymentId = payment.id;
      const asaasSubscriptionId = payment.subscription;
      const customerId = payment.customer;

      let transactionStatus: any = 'PENDING';
      if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') transactionStatus = 'PAID';
      else if (event === 'PAYMENT_OVERDUE' || event === 'PAYMENT_FAILED') transactionStatus = 'FAILED';
      else if (event === 'PAYMENT_REFUNDED' || event === 'PAYMENT_CHARGEBACK_REQUESTED') transactionStatus = 'REFUNDED';
      else if (event === 'PAYMENT_DELETED') transactionStatus = 'FAILED';

      // 1. Find the user
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { asaasCustomerId: customerId },
            { asaasSubscriptionId: asaasSubscriptionId },
          ].filter(Boolean) as any,
        },
      });

      if (user) {
        // 2. Update User Status if it's a payment confirmation or overdue
        if (transactionStatus === 'PAID') {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              subscriptionStatus: 'ACTIVE',
              plan: UserPlan.PREMIUM,
              lastRenewal: new Date(),
              nextRenewal: payment.dueDate ? new Date(payment.dueDate) : undefined,
            },
          });
        } else if (transactionStatus === 'FAILED' && event === 'PAYMENT_OVERDUE') {
            await prisma.user.update({
                where: { id: user.id },
                data: { subscriptionStatus: 'PAST_DUE' }
            });
        }

        // 3. Upsert Transaction Record
        await prisma.transaction.upsert({
          where: { asaasPaymentId },
          update: {
            status: transactionStatus,
            billingType: payment.billingType,
          },
          create: {
            asaasPaymentId,
            amount: payment.value,
            type: asaasSubscriptionId ? 'SUBSCRIPTION' : 'INCOME',
            status: transactionStatus,
            userId: user.id,
            billingType: payment.billingType,
            description: asaasSubscriptionId 
                ? `Assinatura Asaas - ${event}` 
                : `Pagamento Avulso Asaas - ${event}`,
          },
        });

        console.log(`[Asaas Webhook] ${event} processed for user ${user.id}`);
      }
    }

    if (event === 'SUBSCRIPTION_DELETED' || event === 'SUBSCRIPTION_CANCELLED') {
        const id = subscription.id;
        const user = await prisma.user.findUnique({
            where: { asaasSubscriptionId: id }
        });

        if (user) {
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    subscriptionStatus: 'CANCELLED',
                    plan: UserPlan.START
                }
            });
            console.log(`[Asaas Webhook] Subscription cancelled for user ${user.id}`);
        }
    }

    return NextResponse.json({ received: true });

  } catch (error: any) {
    console.error('[Asaas Webhook Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
