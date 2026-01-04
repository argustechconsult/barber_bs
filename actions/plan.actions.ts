'use server';

import { prisma } from '../lib/prisma';
import Stripe from 'stripe';

const stripeKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeKey ? new Stripe(stripeKey) : null;

function getStripe() {
  if (!stripe) throw new Error('Stripe not configured');
  return stripe;
}

export async function getPlans() {
  try {
    const plans = await prisma.plan.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return { success: true, plans };
  } catch (error) {
    console.error('Get Plans Error:', error);
    return { success: false, message: 'Failed to fetch plans' };
  }
}

export async function createPlan(data: { name: string; price: number }) {
  try {
    // 1. Create in DB
    const plan = await prisma.plan.create({
      data: {
        name: data.name,
        price: data.price
      }
    });

    // 2. Sync to Stripe
    try {
      const stripeInstance = getStripe();
      
      const product = await stripeInstance.products.create({
        name: data.name,
        type: 'service',
        metadata: {
             type: 'PLAN',
             planId: plan.id
        }
      });

      const price = await stripeInstance.prices.create({
        product: product.id,
        unit_amount: Math.round(data.price * 100),
        currency: 'brl',
        recurring: { interval: 'month' },
      });

      // 3. Update DB
      const updated = await prisma.plan.update({
        where: { id: plan.id },
        data: {
          stripeProductId: product.id,
          stripePriceId: price.id
        }
      });
      
      return { success: true, plan: updated };

    } catch (stripeError: any) {
      console.error('Stripe Sync Error:', stripeError);
      return { success: true, plan, warning: 'Plan created locally but Stripe sync failed: ' + stripeError.message };
    }

  } catch (error) {
    console.error('Create Plan Error:', error);
    return { success: false, message: 'Failed to create plan' };
  }
}

export async function deletePlan(id: string) {
    try {
        const plan = await prisma.plan.delete({ where: { id } });
        
        // Attempt to archive in Stripe if IDs exist
        if (plan.stripeProductId) {
             try {
                 const stripeInstance = getStripe();
                 await stripeInstance.products.update(plan.stripeProductId, { active: false });
             } catch (e) {
                 console.error('Stripe archive error:', e);
             }
        }

        return { success: true };
    } catch (error) {
        return { success: false, message: 'Failed to delete plan' };
    }
}
