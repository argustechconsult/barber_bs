import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia' as any, // Using 'as any' to bypass specific version check for now, or use latest supported
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: Request) {
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
        // Fallback: Try to find transaction by stripeSessionId if metadata is missing (should verify redundancy)
        // But metadata is reliable here.
        console.warn('Missing transactionId in session metadata');
    }
  }

  return NextResponse.json({ received: true });
}
