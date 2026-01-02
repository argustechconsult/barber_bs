'use server';

import { prisma } from '../lib/prisma';
import Stripe from 'stripe';
import { revalidatePath } from 'next/cache';

// Initialize Stripe (duplicated init or shared - ideally shared but keeping simple)
const stripeKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeKey ? new Stripe(stripeKey) : null;

export async function getServices() {
    try {
        const services = await prisma.service.findMany({
            orderBy: { price: 'asc' }
        });
        return { success: true, services };
    } catch (error) {
        console.error('Get Services Error:', error);
        return { success: false, services: [] };
    }
}

export async function updateService(id: string, data: { price?: number; name?: string }) {
    try {
        // 1. Update DB
        const service = await prisma.service.update({
            where: { id },
            data: { 
                ...(data.price !== undefined && { price: data.price }),
                ...(data.name !== undefined && { name: data.name })
            }
        });

        // 2. Sync to Stripe (Validation: Stripe API key must be present)
        if (!stripe && (data.price !== undefined || data.name !== undefined)) {
            // Warn but proceed? Or just silently skip if no key? 
            // For now, silent skip as per existing pattern, but maybe log it.
        }

        if (stripe && service.stripeProductId) {
             try {
                // Update Product Name
                if (data.name) {
                    await stripe.products.update(service.stripeProductId, {
                        name: data.name
                    });
                }

                // Update Price (Create new, set default)
                if (data.price !== undefined && service.stripePriceId) {
                    const newPrice = await stripe.prices.create({
                        product: service.stripeProductId,
                        unit_amount: Math.round(data.price * 100),
                        currency: 'brl',
                    });

                    // Update DB with new price ID
                    await prisma.service.update({
                        where: { id: service.id },
                        data: { stripePriceId: newPrice.id }
                    });

                    await stripe.products.update(service.stripeProductId, {
                        default_price: newPrice.id
                    });
                }
             } catch (stripeError) {
                 console.error('Stripe Sync Update Error:', stripeError);
             }
        }

        revalidatePath('/settings'); 
        return { success: true, service };
    } catch (error) {
        console.error('Update Service Error:', error);
        return { success: false, message: 'Failed to update service' };
    }
}

export async function deleteService(id: string) {
    try {
        const service = await prisma.service.delete({ where: { id } });

        // Deactivate in Stripe (Archive product)
        if (stripe && service.stripeProductId) {
            try {
                await stripe.products.update(service.stripeProductId, {
                    active: false
                });
            } catch (stripeError) {
                 console.error('Stripe Archive Error:', stripeError);
            }
        }

        revalidatePath('/settings');
        return { success: true };
    } catch (error) {
        console.error('Delete Service Error:', error);
        return { success: false, message: 'Failed to delete service' };
    }
}
