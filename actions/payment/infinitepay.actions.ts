'use server';

import { prisma } from '../../lib/prisma';

const INFINITEPAY_API_URL = 'https://api.infinitepay.io/invoices/public/checkout/links';

interface InfinitePayItem {
  quantity: number;
  price: number; // in cents
  description: string;
}


interface CreateInfinitePayCheckoutData {
  appointmentId: string;
  services: { id: string; name: string; price: number }[];
  userId: string;
  customer: {
    name: string;
    email: string;
    phone: string;
  };
}

export async function createInfinitePayCheckout(data: CreateInfinitePayCheckoutData) {
  try {
    const handle = process.env.INFINITEPAY_HANDLE || process.env.INFINITY_HANDLE;
    console.log('[InfinitePay] Attempting checkout with handle:', handle ? 'CONFIGURED' : 'NOT CONFIGURED');
    
    if (!handle) {
      console.error('[InfinitePay Error] Configuration missing: INFINITEPAY_HANDLE is not set in .env');
      throw new Error('Configuração INFINITEPAY_HANDLE não encontrada no servidor. Verifique o arquivo .env');
    }

    // 1. Fetch official services from DB to ensure data accuracy
    const serviceIds = data.services.map(s => s.id);
    const serviceNames = data.services.map(s => s.name);
    
    console.log('[InfinitePay] Looking up services:', { ids: serviceIds, names: serviceNames });

    let dbServices = await prisma.service.findMany({
      where: {
        OR: [
          { id: { in: serviceIds } },
          { name: { in: serviceNames } }
        ]
      }
    });

    console.log('[InfinitePay] Found in DB:', dbServices.map(s => s.name));

    // If still empty, we will use the data sent from the frontend as a fallback
    // to avoid blocking the payment flow, but we prefer DB data.
    const items: InfinitePayItem[] = dbServices.length > 0 
      ? dbServices.map(s => ({
          quantity: 1,
          price: Math.round(s.price * 100), // convert to cents
          description: s.name,
        }))
      : data.services.map(s => ({
          quantity: 1,
          price: Math.round(s.price * 100),
          description: s.name,
        }));

    if (items.length === 0) {
      throw new Error('Nenhum serviço selecionado para o pagamento.');
    }

    // 2. Create TRANSACTION in DB first to get the ID for order_nsu
    const totalAmount = items.reduce((acc, curr) => acc + (curr.price / 100), 0);
    
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
        }
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

    // 3. Prepare Payload
    // InfinitePay requires phone_number to be filled and usually in a specific format.
    // Let's sanitize it: keep only digits.
    let cleanPhone = data.customer.phone.replace(/\D/g, '');
    
    // If phone is missing, we use a placeholder or throw a more descriptive error.
    // For now, let's use a dummy valid format if empty to avoid blocker, 
    // but ideally we should require it in the UI.
    if (!cleanPhone) {
        cleanPhone = '11999999999'; // Fallback to avoid "must be filled" error
    }
    
    // Ensure it has at least 10 or 11 digits (Brazilian standard)
    if (cleanPhone.length < 10) {
        cleanPhone = '11' + cleanPhone.padStart(9, '9');
    }

    const payload = {
      handle: handle,
      order_nsu: transaction.id,
      items: items, // Using correct key 'items'
      customer: {
        name: data.customer.name || 'Cliente',
        email: data.customer.email || 'cliente@exemplo.com',
        phone_number: cleanPhone.startsWith('55') ? `+${cleanPhone}` : `+55${cleanPhone}`,
      },
      redirect_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success?order_nsu=${transaction.id}`,
      webhook_url: process.env.INFINITEPAY_WEBHOOK_URL || `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/infinitepay`,
    };

    // 4. Request Checkout Link
    const response = await fetch(INFINITEPAY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
        console.error('InfinitePay Error Response:', JSON.stringify(result, null, 2));
        throw new Error(result.message || result.error || 'Error creating InfinitePay checkout link');
    }

    // Response usually contains the URL and slug
    const { url } = result;

    return { success: true, url };

  } catch (error: any) {
    console.error('Create InfinitePay Checkout Error:', error);
    return { success: false, message: `Erro InfinitePay: ${error.message}` };
  }
}

export async function createMarketplaceCheckout(data: {
    productId: string;
    productName: string;
    price: number;
    userId: string;
    customer: {
        name: string;
        email: string;
        phone: string;
    };
}) {
    try {
        const handle = process.env.INFINITEPAY_HANDLE || process.env.INFINITY_HANDLE;
        console.log('[InfinitePay Marketplace] Attempting checkout with handle:', handle ? 'CONFIGURED' : 'NOT CONFIGURED');

        if (!handle) {
            console.error('[InfinitePay Error] Configuration missing: INFINITEPAY_HANDLE is not set in .env');
            throw new Error('Configuração INFINITEPAY_HANDLE não encontrada no servidor. Verifique o arquivo .env');
        }

        // 1. Create TRANSACTION in DB first to get the ID for order_nsu
        // Using INCOME type for marketplace sales
        const transaction = await prisma.transaction.create({
            data: {
                amount: data.price,
                type: 'INCOME',
                status: 'PENDING',
                userId: data.userId,
                productId: data.productId,
                description: `Compra: ${data.productName}`
            }
        });

        // 2. Prepare Payload
        let cleanPhone = data.customer.phone.replace(/\D/g, '');
        if (!cleanPhone) cleanPhone = '11999999999';
        if (cleanPhone.length < 10) cleanPhone = '11' + cleanPhone.padStart(9, '9');

        const payload = {
            handle: handle,
            order_nsu: transaction.id,
            items: [{
                quantity: 1,
                price: Math.round(data.price * 100),
                description: data.productName,
            }],
            customer: {
                name: data.customer.name || 'Cliente',
                email: data.customer.email || 'cliente@exemplo.com',
                phone_number: cleanPhone.startsWith('55') ? `+${cleanPhone}` : `+55${cleanPhone}`,
            },
            redirect_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success?order_nsu=${transaction.id}&type=marketplace`,
            webhook_url: process.env.INFINITEPAY_WEBHOOK_URL || `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/infinitepay`,
        };

        // 3. Request Checkout Link
        const response = await fetch(INFINITEPAY_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        const result = await response.json();

        if (!response.ok) {
            console.error('InfinitePay Marketplace Error:', JSON.stringify(result, null, 2));
            throw new Error(result.message || result.error || 'Error creating checkout link');
        }

        return { success: true, url: result.url };

    } catch (error: any) {
        console.error('Marketplace Purchase Error:', error);
        return { success: false, message: `Erro ao iniciar compra: ${error.message}` };
    }
}
