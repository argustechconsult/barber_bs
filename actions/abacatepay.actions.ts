'use server';

import { prisma } from '../lib/prisma';

const ABACATE_API_URL = 'https://api.abacatepay.com/v1';

interface CreateAbacateBillingData {
  appointmentId: string;
  services: { name: string; price: number }[];
  userId: string;
  method: 'PIX' | 'CARD';
}

export async function createAbacateBilling(data: CreateAbacateBillingData) {
  try {
    const apiKey = process.env.ABACATEPAY_API_KEY;
    if (!apiKey) {
      throw new Error('ABACATEPAY_API_KEY is not configured');
    }

    // 1. Fetch User details for Customer creation
    const user = await prisma.user.findUnique({
      where: { id: data.userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // 2. Calculate Total
    const totalAmount = data.services.reduce((acc, curr) => acc + curr.price, 0);

    // 3. Create Transaction in DB
    const transaction = await prisma.transaction.create({
      data: {
        amount: totalAmount,
        type: 'APPOINTMENT',
        status: 'PENDING',
        userId: data.userId,
        appointmentId: data.appointmentId,
      },
    });

    // 4. Create Billing in AbacatePay
    const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/?canceled=true`;
    const completionUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/?success=true`;

    // Prepare Customer Data logic
    // Card payments often require customer details.
    // We will attempt to send it. We need TaxID, so we'll use a placeholder if missing for now
    // or rely on metadata if validation permits (but previous error said cellphone required -> implies we sent customer obj?).
    // Actually, we explicitly set customerData = null before.
    // Let's try to populate it properly.
    
    let customerData = null;
    let sanitizedPhone = '';
    if (user.whatsapp) {
        sanitizedPhone = user.whatsapp.replace(/\D/g, '');
    }
    
    // Ensure phone has valid length (e.g. 10 or 11 digits for BR)
    if (sanitizedPhone.length < 10) sanitizedPhone = '11999999999'; // Fallback dummy

    // Dummy TaxID for dev/test if not in DB
    const taxId = '00000000000'; 

    customerData = {
        name: user.name,
        email: user.email || 'cliente@barber.com',
        cellphone: sanitizedPhone,
        taxId: taxId 
    };

    const payload: any = {
      frequency: 'ONE_TIME',
      methods: [data.method],
      products: data.services.map((s) => ({
        externalId: s.name, 
        name: s.name,
        description: 'Serviço de Barbearia',
        quantity: 1,
        price: Math.round(s.price * 100), // in cents
      })),
      returnUrl,
      completionUrl,
      metadata: {
        transactionId: transaction.id,
        appointmentId: data.appointmentId,
        customerId: user.id,
        customerName: user.name,
        customerEmail: user.email
      },
    };

    if (customerData) {
        payload.customer = customerData;
    }

    const response = await fetch(`${ABACATE_API_URL}/billing/create`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
        console.error('AbacatePay Error Response:', JSON.stringify(result, null, 2));
        const errorMessage = result.error ? JSON.stringify(result.error) : 'Error creating AbacatePay billing';
        throw new Error(errorMessage);
    }

    const { url, id: abacateId } = result.data;

    await prisma.transaction.update({
        where: { id: transaction.id },
        data: { stripeSessionId: abacateId } 
    });

    return { success: true, url };

  } catch (error: any) {
    console.error('Create AbacateBilling Error:', error);
    return { success: false, message: `Erro AbacatePay: ${error.message}` };
  }
}
