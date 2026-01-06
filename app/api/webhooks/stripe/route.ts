import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';

// Initialize Stripe only if the key is available to prevent build errors
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-12-18.acacia' as any,
    })
  : null;

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: Request) {
  if (!process.env.STRIPE_SECRET_KEY || !stripe) {
    console.error('Stripe Secret Key not configured');
    return NextResponse.json(
      { error: 'Stripe Secret Key not configured' },
      { status: 500 }
    );
  }

  if (!webhookSecret) {
    return NextResponse.json(
      { error: 'Stripe Webhook Secret not configured' },
      { status: 500 }
    );
  }

  const body = await req.text();
  const signature = (await headers()).get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`);
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    // Check if it's a subscription checkout
    if (session.mode === 'subscription') {
         const userId = session.metadata?.userId;
         const plan = session.metadata?.plan;
         const customerId = session.customer as string;
         const subscriptionId = session.subscription as string;

         if (userId && plan === 'PREMIUM') {
             await prisma.user.update({
                 where: { id: userId },
                 data: {
                     plan: 'PREMIUM',
                     stripeCustomerId: customerId,
                     stripeSubscriptionId: subscriptionId,
                     subscriptionStatus: 'ACTIVE'
                 }
             });
             console.log(`User ${userId} upgraded to PREMIUM.`);
         }
         return NextResponse.json({ received: true });
    }

    // Retrieve metadata or look up by session ID
    const transactionId = session.metadata?.transactionId;
    const appointmentId = session.metadata?.appointmentId;

    if (transactionId) {
      try {
        // Update Transaction
        await prisma.transaction.update({
          where: { id: transactionId },
          data: { status: 'PAID' },
        });

        // Update Appointment (if linked)
        if (appointmentId) {
           await prisma.appointment.update({
             where: { id: appointmentId },
             data: { status: 'CONFIRMED' }
           });
        }
        
        console.log(`Transaction ${transactionId} marked as PAID.`);
      } catch (error) {
        console.error('Error updating transaction/appointment:', error);
        return NextResponse.json(
          { error: 'Error updating database' },
          { status: 500 }
        );
      }
    } else {
        console.warn('Missing transactionId in session metadata');
    }
  } else if (event.type === 'invoice.payment_succeeded') {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = (invoice as any).subscription as string;

      if (subscriptionId) {
          const user = await prisma.user.findFirst({
              where: { stripeSubscriptionId: subscriptionId }
          });
          if (user) {
              await prisma.user.update({
                  where: { id: user.id },
                  data: { subscriptionStatus: 'ACTIVE' }
              });
              console.log(`Subscription ${subscriptionId} payment succeeded. User ${user.id} active.`);
          }
      }
  } else if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = (invoice as any).subscription as string;

      if (subscriptionId) {
          const user = await prisma.user.findFirst({
              where: { stripeSubscriptionId: subscriptionId }
          });
          if (user) {
              await prisma.user.update({
                  where: { id: user.id },
                  data: { subscriptionStatus: 'PAST_DUE' }
              });
              console.log(`Subscription ${subscriptionId} payment failed. User ${user.id} past_due.`);
          }
      }
  } else if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription;
      const user = await prisma.user.findFirst({
          where: { stripeSubscriptionId: subscription.id }
      });
      if (user) {
          await prisma.user.update({
              where: { id: user.id },
              data: { subscriptionStatus: 'CANCELED', plan: 'START' } // Use your specific logic (maybe revert to START?)
          });
          console.log(`Subscription ${subscription.id} canceled. User ${user.id} reverted to START.`);
      }
  }

  return NextResponse.json({ received: true });
}
