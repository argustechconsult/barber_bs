import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('--- InfinitePay Webhook Received ---');
    console.log(JSON.stringify(body, null, 2));

    const { 
        invoice_slug, 
        amount, 
        transaction_nsu, 
        order_nsu, 
        receipt_url 
    } = body;

    // order_nsu is our Transaction ID
    if (!order_nsu) {
        return NextResponse.json({ error: 'Missing order_nsu' }, { status: 400 });
    }

    // 1. Find the transaction
    const transaction = await prisma.transaction.findUnique({
      where: { id: order_nsu },
      include: { appointment: true, user: true }
    });

    if (!transaction) {
        console.error(`Transaction not found: ${order_nsu}`);
        return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // 2. Update Transaction and Appointment
    await prisma.transaction.update({
      where: { id: order_nsu },
      data: {
        status: 'PAID',
        infinitePayTransactionNSU: transaction_nsu,
        infinitePaySlug: invoice_slug,
        infinitePayReceiptUrl: receipt_url,
      }
    });

    if (transaction.appointmentId) {
        await prisma.appointment.update({
            where: { id: transaction.appointmentId },
            data: { status: 'CONFIRMED' }
        });
    }

    // 2.5 If it's a product purchase, decrement stock
    if (transaction.productId) {
        try {
            await prisma.product.update({
                where: { id: transaction.productId },
                data: {
                    stock: {
                        decrement: 1
                    }
                }
            });
            console.log(`[Stock] Decremented stock for product: ${transaction.productId}`);
        } catch (stockError) {
            console.error('[Stock Error] Failed to decrement stock:', stockError);
        }
    }

    // 3. Send WhatsApp Notification (MOCKED for now as requested for functional test area)
    // The user wants to "enviar e armazenar reicpt_url para o whatsapp do cliente"
    if (transaction.user?.whatsapp && receipt_url) {
        console.log(`[WhatsApp Mock] Sending receipt to ${transaction.user.whatsapp}: ${receipt_url}`);
        // Here you would call your WhatsApp service
    }

    return NextResponse.json({ received: true }, { status: 200 });

  } catch (error: any) {
    console.error('InfinitePay Webhook Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
