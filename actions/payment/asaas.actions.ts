'use server';

import { prisma } from '../../lib/prisma';
import { asaas } from '../../lib/asaas';
import { UserPlan } from '../../types';

interface CreditCardData {
  holderName: string;
  number: string;
  expiryMonth: string;
  expiryYear: string;
  ccv: string;
}

interface CreateSubscriptionData {
  userId: string;
  planId: string;
  billingType: 'CREDIT_CARD' | 'PIX';
  customerInfo: {
    cpfCnpj: string;
    phone: string;
    postalCode: string;
    address: string;
    addressNumber: string;
    addressComplement?: string;
    province: string;
    city: string;
  };
  creditCard?: CreditCardData;
}

export async function createAsaasSubscription(data: CreateSubscriptionData) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: data.userId },
    });

    if (!user) throw new Error('Usuário não encontrado');

    const plan = await prisma.plan.findUnique({
      where: { id: data.planId },
    });

    if (!plan) throw new Error('Plano não encontrado');

    // 1. Ensure Asaas Customer exists
    let asaasCustomerId = user.asaasCustomerId;

    if (!asaasCustomerId) {
      const customer = await asaas.createCustomer({
        name: user.name,
        email: user.email || undefined,
        cpfCnpj: data.customerInfo.cpfCnpj,
        mobilePhone: data.customerInfo.phone,
        postalCode: data.customerInfo.postalCode,
        addressNumber: data.customerInfo.addressNumber,
      });
      asaasCustomerId = customer.id;

      // Update user with Asaas info and address
      await prisma.user.update({
        where: { id: user.id },
        data: {
          asaasCustomerId: customer.id,
          cpfCnpj: data.customerInfo.cpfCnpj,
          phone: data.customerInfo.phone,
          postalCode: data.customerInfo.postalCode,
          address: data.customerInfo.address,
          addressNumber: data.customerInfo.addressNumber,
          addressComplement: data.customerInfo.addressComplement,
          province: data.customerInfo.province,
          city: data.customerInfo.city,
        },
      });
    }

    // 2. Create Subscription
    // For Pix/Credit Card immediate charge, we set nextDueDate to today (Local Time).
    // Fix: new Date().toISOString() returns UTC, which might be tomorrow in Brasilia (-3h)
    const today = new Date();
    today.setHours(today.getHours() - 3); // Adjust for UTC-3
    const todayStr = today.toISOString().split('T')[0];
    const nextDueDate = todayStr;

    // Fallback: Asaas Sandbox often rejects 'PIX' for subscriptions. 
    // We use 'BOLETO' which is a Hybrid Boleto (contains Pix).
    // We will still fetch the Pix QR Code for it.
    const effectiveBillingType = data.billingType === 'PIX' ? 'BOLETO' : data.billingType;

    const subscriptionData: any = {
      customer: asaasCustomerId,
      billingType: effectiveBillingType,
      value: plan.price,
      nextDueDate: nextDueDate,
      cycle: 'MONTHLY',
      description: `Assinatura Plano ${plan.name}`,
    };

    if (data.billingType === 'CREDIT_CARD' && data.creditCard) {
      subscriptionData.creditCard = data.creditCard;
      subscriptionData.creditCardHolderInfo = {
        name: user.name,
        email: user.email || 'financeiro@stayler.com',
        cpfCnpj: data.customerInfo.cpfCnpj,
        postalCode: data.customerInfo.postalCode,
        addressNumber: data.customerInfo.addressNumber,
        phone: data.customerInfo.phone,
      };
    }

    console.log('[DEBUG] Subscription Payload:', JSON.stringify(subscriptionData, null, 2));

    const subscription = await asaas.createSubscription(subscriptionData);

    // 3. Update User with subscription ID and Plan
    const nextRenewalDate = new Date();
    nextRenewalDate.setMonth(nextRenewalDate.getMonth() + 1);
    const nextRenewalStr = nextRenewalDate.toISOString().split('T')[0];

    // 4. If PIX (or Hybrid Boleto fallback), get the QR Code of the first payment
    const payments = await asaas.getSubscriptionPayments(subscription.id);
    const firstPayment = payments.data[0];

    const isPaid = firstPayment?.status === 'RECEIVED' || firstPayment?.status === 'CONFIRMED';

    await prisma.user.update({
      where: { id: user.id },
      data: {
        asaasSubscriptionId: subscription.id,
        subscriptionStatus: isPaid ? 'ACTIVE' : 'PENDING',
        plan: UserPlan.PREMIUM,
        lastRenewal: new Date(),
        nextRenewal: nextRenewalDate,
      }
    });

    if (firstPayment) {
        // Upsert initial transaction record
        await prisma.transaction.upsert({
            where: { asaasPaymentId: firstPayment.id },
            update: {
                status: isPaid ? 'PAID' : 'PENDING',
                billingType: firstPayment.billingType,
                expiration_date: nextRenewalDate, // Service is valid until next renewal
            },
            create: {
                asaasPaymentId: firstPayment.id,
                amount: firstPayment.value,
                type: 'SUBSCRIPTION',
                status: isPaid ? 'PAID' : 'PENDING',
                userId: user.id,
                billingType: firstPayment.billingType,
                description: `Assinatura Plano ${plan.name} - Inicial`,
                expiration_date: nextRenewalDate, // Service is valid until next renewal
            },
        });

        if (data.billingType === 'PIX') {
            const qrCodeData = await asaas.getPixQrCode(firstPayment.id);
            return { 
                success: true, 
                subscriptionId: subscription.id,
                pix: qrCodeData,
                amount: firstPayment.value,
                expirationDate: nextRenewalStr, // Show next renewal date on success page
            };
        }

        return { 
            success: true, 
            subscriptionId: subscription.id,
            amount: firstPayment.value,
            expirationDate: nextRenewalStr, // Show next renewal date on success page
        };
    }

    return { success: true, subscriptionId: subscription.id };

  } catch (error: any) {
    console.error('[createAsaasSubscription Error]:', error);
    return { success: false, message: error.message };
  }
}

export async function syncUserAsaasStatus(userId: string) {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, asaasSubscriptionId: true }
        });

        if (!user?.asaasSubscriptionId) {
            return { success: false, message: 'Nenhuma assinatura encontrada para este usuário.' };
        }

        const sub = await asaas.getSubscription(user.asaasSubscriptionId);
        
        let status = 'INACTIVE';
        if (sub.status === 'ACTIVE') status = 'ACTIVE';
        else if (sub.status === 'OVERDUE') status = 'PAST_DUE';
        else if (sub.status === 'EXPIRED') status = 'INACTIVE';
        else if (sub.status === 'DELETED') status = 'CANCELLED';

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                subscriptionStatus: status,
                plan: status === 'ACTIVE' ? UserPlan.PREMIUM : UserPlan.START
            }
        });

        // Also sync payments
        const payments = await asaas.getSubscriptionPayments(user.asaasSubscriptionId);
        for (const payment of payments.data) {
            await prisma.transaction.upsert({
                where: { asaasPaymentId: payment.id },
                update: {
                    status: (payment.status === 'RECEIVED' || payment.status === 'CONFIRMED') ? 'PAID' : 
                            (payment.status === 'OVERDUE' || payment.status === 'FAILED') ? 'FAILED' : 'PENDING'
                },
                create: {
                    asaasPaymentId: payment.id,
                    amount: payment.value,
                    type: 'SUBSCRIPTION',
                    status: (payment.status === 'RECEIVED' || payment.status === 'CONFIRMED') ? 'PAID' : 'PENDING',
                    userId: userId,
                    billingType: payment.billingType,
                    description: `Renovação Assinatura Asaas - ${payment.billingType}`,
                    createdAt: payment.dateCreated ? new Date(payment.dateCreated) : new Date(),
                    expiration_date: payment.dueDate ? new Date(payment.dueDate) : null,
                }
            });
        }

        return { success: true, status };
    } catch (error: any) {
        console.error('[syncUserAsaasStatus Error]:', error);
        return { success: false, message: error.message };
    }
}

export async function cancelAsaasSubscription(userId: string) {
    try {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user?.asaasSubscriptionId) throw new Error('Assinatura não encontrada');

        await asaas.deleteSubscription(user.asaasSubscriptionId);

        await prisma.user.update({
            where: { id: userId },
            data: {
                asaasSubscriptionId: null,
                subscriptionStatus: 'CANCELLED',
                plan: UserPlan.START
            }
        });

        return { success: true };
    } catch (error: any) {
        console.error('[cancelAsaasSubscription Error]:', error);
        return { success: false, message: error.message };
    }
}
