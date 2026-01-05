'use server';

import { prisma } from '../lib/prisma';

const ABACATE_API_URL = 'https://api.abacatepay.com/v1';

interface CreateAbacateBillingData {
  appointmentId: string;
  services: { name: string; price: number }[];
  userId: string;
  method: 'PIX' | 'CARD';
}

// Helper to generate valid CPF for testing
function generateValidCPF(): string {
  const rnd = (n: number) => Math.round(Math.random() * n);
  const mod = (dividend: number, divisor: number) => Math.round(dividend - (Math.floor(dividend / divisor) * divisor));
  
  const n1 = rnd(9);
  const n2 = rnd(9);
  const n3 = rnd(9);
  const n4 = rnd(9);
  const n5 = rnd(9);
  const n6 = rnd(9);
  const n7 = rnd(9);
  const n8 = rnd(9);
  const n9 = rnd(9);
  
  let d1 = n9 * 2 + n8 * 3 + n7 * 4 + n6 * 5 + n5 * 6 + n4 * 7 + n3 * 8 + n2 * 9 + n1 * 10;
  d1 = 11 - (mod(d1, 11));
  if (d1 >= 10) d1 = 0;
  
  let d2 = d1 * 2 + n9 * 3 + n8 * 4 + n7 * 5 + n6 * 6 + n5 * 7 + n4 * 8 + n3 * 9 + n2 * 10 + n1 * 11;
  d2 = 11 - (mod(d2, 11));
  if (d2 >= 10) d2 = 0;
  
  return `${n1}${n2}${n3}${n4}${n5}${n6}${n7}${n8}${n9}${d1}${d2}`;
}

export async function createAbacateBilling(data: CreateAbacateBillingData) {
  try {
    const apiKey = process.env.ABACATEPAY_API_KEY;
    if (!apiKey) {
      throw new Error('ABACATEPAY_API_KEY is not configured');
    }

    // 1. Fetch User details
    const user = await prisma.user.findUnique({
      where: { id: data.userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // 2. Calculate Total
    const totalAmount = data.services.reduce((acc, curr) => acc + curr.price, 0);

    // 3. Create or Get Transaction in DB
    let transaction = await prisma.transaction.findUnique({
        where: { appointmentId: data.appointmentId }
    });

    if (!transaction) {
         transaction = await prisma.transaction.create({
            data: {
                amount: totalAmount,
                type: 'APPOINTMENT',
                status: 'PENDING',
                userId: data.userId,
                appointmentId: data.appointmentId,
            },
        });
    } else {
        transaction = await prisma.transaction.update({
            where: { id: transaction.id },
            data: { 
                amount: totalAmount,
                updatedAt: new Date()
            }
        });
    }

    // 4. Create Billing in AbacatePay
    const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/?canceled=true`;
    const completionUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/?success=true`;

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
        // customerName: user.name, // Omit to avoid partial data issues? actually metadata is fine
        // customerEmail: user.email
      },
    };

    // Note: We are omitting 'customer' object so AbacatePay checkout collects the data (CPF, etc)
    // if (customerData) {
    //    payload.customer = customerData;
    // }

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
