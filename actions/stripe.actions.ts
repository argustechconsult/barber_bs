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
