'use server';

import { prisma } from '../lib/prisma';
import Stripe from 'stripe';

// Initialize Stripe
const stripeKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeKey ? new Stripe(stripeKey) : null;

interface CreateServiceData {
    name: string;
    price: number;
    duration?: number;
}

interface CreateProductData {
    name: string;
    description: string;
    category: string;
    price: number;
}

// --- Helper to ensure Stripe is ready ---
function getStripe() {
    if (!stripe) {
        throw new Error('Stripe API Key not configured');
    }
    return stripe;
}

// --- SERVICE ACTIONS ---

export async function createService(data: CreateServiceData) {
    try {
        // 1. Create in DB first (as requested)
        const service = await prisma.service.create({
            data: {
                name: data.name,
                price: data.price,
                duration: data.duration || 30
            }
        });

        // 2. Create in Stripe
        try {
            const stripeInstance = getStripe();
            
            // Create Product in Stripe
            const stripeProduct = await stripeInstance.products.create({
                name: data.name,
                type: 'service', // Optional, defaults to service usually.
            });

            // Create Price in Stripe
            const stripePrice = await stripeInstance.prices.create({
                product: stripeProduct.id,
                unit_amount: Math.round(data.price * 100), // cents
                currency: 'brl',
            });

            // 3. Update DB with Stripe IDs
            const updated = await prisma.service.update({
                where: { id: service.id },
                data: {
                    stripeProductId: stripeProduct.id,
                    stripePriceId: stripePrice.id
                }
            });

            return { success: true, service: updated };

        } catch (stripeError) {
            console.error('Stripe Sync Error (Service):', stripeError);
            // Return success but with warning? Or fail? 
            // User flow suggests we keep the DB record but maybe we should flag it?
            // For now, returning the service created in DB but warning about sync.
            return { success: true, service, warning: 'Created in DB, but failed to sync to Stripe.' };
        }

    } catch (error) {
        console.error('Create Service Error:', error);
        return { success: false, message: 'Failed to create service' };
    }
}

// --- PRODUCT ACTIONS ---

export async function createProduct(data: CreateProductData) {
    try {
        // 1. Create in DB
        const product = await prisma.product.create({
            data: {
                name: data.name,
                description: data.description,
                category: data.category,
                price: data.price
            }
        });

        // 2. Sync to Stripe
        try {
            const stripeInstance = getStripe();

            // Create Product
            const stripeProduct = await stripeInstance.products.create({
                name: data.name,
                description: data.description,
                active: true,
                metadata: {
                    category: data.category,
                    dbId: product.id
                }
            });

            // Create Price
            const stripePrice = await stripeInstance.prices.create({
                product: stripeProduct.id,
                unit_amount: Math.round(data.price * 100), // cents
                currency: 'brl',
            });

            // 3. Update DB
            const updated = await prisma.product.update({
                where: { id: product.id },
                data: {
                    stripeProductId: stripeProduct.id,
                    stripePriceId: stripePrice.id
                }
            });

            return { success: true, product: updated };

        } catch (stripeError) {
             console.error('Stripe Sync Error (Product):', stripeError);
             return { success: true, product, warning: 'Created in DB, but failed to sync to Stripe.' };
        }

    } catch (error) {
        console.error('Create Product Error:', error);
        return { success: false, message: 'Failed to create product' };
    }
}

// --- CHECKOUT ACTIONS ---
interface CreateCheckoutSessionData {
    appointmentId: string;
    services: { name: string; price: number }[];
    userId: string;
    paymentMethodTypes?: Stripe.Checkout.SessionCreateParams.PaymentMethodType[];
}

export async function createCheckoutSession(data: CreateCheckoutSessionData) {
    try {
        const stripeInstance = getStripe();
        
        // Calculate total
        const totalAmount = data.services.reduce((acc, curr) => acc + curr.price, 0);

        // 1. Create TRANSACTION record first
        const transaction = await prisma.transaction.create({
            data: {
                amount: totalAmount,
                type: 'APPOINTMENT',
                status: 'PENDING',
                userId: data.userId,
                appointmentId: data.appointmentId,
            }
        });

        const paymentMethodTypes = data.paymentMethodTypes || ['card'];
        
        const sessionParams: Stripe.Checkout.SessionCreateParams = {
            payment_method_types: paymentMethodTypes,
            line_items: data.services.map(s => ({
                price_data: {
                    currency: 'brl',
                    product_data: {
                        name: s.name,
                    },
                    unit_amount: Math.round(s.price * 100), // cents
                },
                quantity: 1,
            })),
            mode: 'payment',
            success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/?success=true&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/?canceled=true`,
            metadata: {
                transactionId: transaction.id,
                appointmentId: data.appointmentId,
                userId: data.userId
            },
        };

        if (paymentMethodTypes.includes('pix')) {
            sessionParams.payment_method_options = {
                pix: {
                    expires_after_seconds: 3600
                }
            };
        }

        // 2. Create Stripe Checkout Session
        const session = await stripeInstance.checkout.sessions.create(sessionParams);
        
        // Update transaction with session ID
        await prisma.transaction.update({
            where: { id: transaction.id },
            data: { stripeSessionId: session.id }
        });

        return { success: true, url: session.url };

    } catch (error) {
    }
}

// --- SUBSCRIPTION ACTIONS ---

interface CreateSubscriptionData {
    userId: string;
    priceId: string; // Stripe Price ID for the recurring plan
    customerId?: string; // If user already has a stripe customer ID
}

export async function createSubscriptionCheckoutSession(data: CreateSubscriptionData) {
    try {
        const stripeInstance = getStripe();
        
        let customerId = data.customerId;

        // If no customer ID, we might want to creating one or let Stripe create it during checkout
        // Best practice: Pass customer_email if creating new, or customer ID if existing.
        
        const user = await prisma.user.findUnique({
             where: { id: data.userId },
             select: { email: true, stripeCustomerId: true }
        });

        if (user?.stripeCustomerId) {
            customerId = user.stripeCustomerId;
        }

        const sessionParams: Stripe.Checkout.SessionCreateParams = {
            mode: 'subscription',
            payment_method_types: ['card'],
            line_items: [
                {
                    price: data.priceId || process.env.STRIPE_PREMIUM_PRICE_ID,
                    quantity: 1,
                },
            ],
            success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/?subscription_success=true&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/?canceled=true`,
            metadata: {
                userId: data.userId,
                plan: 'PREMIUM'
            },
        };

        if (customerId) {
            sessionParams.customer = customerId;
        } else if (user?.email) {
            sessionParams.customer_email = user.email;
        }

        const session = await stripeInstance.checkout.sessions.create(sessionParams);

        // We do NOT create a 'Transaction' record here yet, or maybe we should?
        // Usually, subscription payments are handled via webhooks (invoice.payment_succeeded).
        // But we can create a pending Transaction record if we want to track the *attempt*.
        // For simplicity, we rely on webhook to activate subscription.

        return { success: true, url: session.url };

    } catch (error) {
        console.error('Create Subscription Checkout Error:', error);
        return { success: false, message: `Erro Subscription: ${(error as any).message}` };
    }
}
