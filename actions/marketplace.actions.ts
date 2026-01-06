'use server';

import { prisma } from '../lib/prisma';
import Stripe from 'stripe';

const stripeKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeKey ? new Stripe(stripeKey) : null;

function getStripe() {
  if (!stripe) {
    throw new Error('Stripe API Key not configured');
  }
  return stripe;
}

export async function createProduct(data: {
  name: string;
  price: number;
  category: string;
  image?: string; // Optional Base64 image
}) {
  console.log('--- createProduct START ---');
  // ... logging ...

  try {
    // 1. Create in DB
    const product = await prisma.product.create({
      data: {
        name: data.name,
        price: data.price,
        category: data.category,
        description: '', 
        image: data.image,
      },
    });

    // 2. Sync to Stripe
    try {
      const stripeInstance = getStripe();

      const stripeProduct = await stripeInstance.products.create({
        name: data.name,
        metadata: {
          category: data.category,
          dbId: product.id,
        },
      });

      const stripePrice = await stripeInstance.prices.create({
        product: stripeProduct.id,
        unit_amount: Math.round(data.price * 100),
        currency: 'brl',
      });

      await prisma.product.update({
        where: { id: product.id },
        data: {
          stripeProductId: stripeProduct.id,
          stripePriceId: stripePrice.id,
        },
      });
      console.log('--- Stripe Sync SUCCESS ---');
    } catch (stripeError) {
      console.error('--- Stripe Sync ERROR ---', stripeError);
      // We don't fail the whole request if Stripe fails, just log it.
    }

    console.log('--- createProduct SUCCESS ---', product.id);
    return { success: true, product };
  } catch (error: any) {
    console.error('--- createProduct ERROR ---', error);
    return { success: false, message: 'Failed to create product: ' + error.message };
  }
}

export async function getProducts() {
  try {
    const products = await prisma.product.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
    return { success: true, products };
  } catch (error) {
    console.error('Get Products Error:', error);
    return { success: false, products: [], message: 'Failed to fetch products' };
  }
}

export async function deleteProduct(id: string) {
  try {
    // 1. Get product to find Stripe ID
    const product = await prisma.product.findUnique({ where: { id } });

    // 2. Archive in Stripe
    if (product?.stripeProductId) {
      try {
        const stripeInstance = getStripe();
        await stripeInstance.products.update(product.stripeProductId, {
          active: false,
        });
      } catch (err) {
        console.error('Failed to archive in Stripe:', err);
      }
    }

    // 3. Delete from DB
    await prisma.product.delete({
      where: { id },
    });
    return { success: true };
  } catch (error) {
    console.error('Delete Product Error:', error);
    return { success: false, message: 'Failed to delete product' };
  }
}

export async function updateProduct(
  id: string,
  data: {
    name: string;
    price: number;
    category: string;
    image?: string;
  }
) {
  console.log('--- updateProduct START ---');
  // ... logging ...

  try {
    // 1. Update DB
    const product = await prisma.product.update({
      where: { id },
      data: {
        name: data.name,
        price: data.price,
        category: data.category,
        image: data.image,
      },
    });

    // 2. Sync Stripe
    if (product.stripeProductId) {
      try {
        const stripeInstance = getStripe();
        
        // Update product metadata/name
        await stripeInstance.products.update(product.stripeProductId, {
          name: data.name,
          metadata: {
            category: data.category,
          },
        });

        // Check if price changed (optimization: check against old price if possible, or just create new)
        // Since we don't strictly track the *current* stripe price object in validation, 
        // we can create a new price if the amount is different, or just always create a new one and set it as default.
        // For simplicity: Create new price logic.
        
        const stripePrice = await stripeInstance.prices.create({
            product: product.stripeProductId,
            unit_amount: Math.round(data.price * 100),
            currency: 'brl',
        });

        // Update default price in Stripe Product
        await stripeInstance.products.update(product.stripeProductId, {
            default_price: stripePrice.id
        });

        // Update DB with new price ID
        await prisma.product.update({
             where: { id },
             data: { stripePriceId: stripePrice.id }
        });

      } catch (stripeError) {
         console.error('--- Stripe Update ERROR ---', stripeError);
      }
    }

    console.log('--- updateProduct SUCCESS ---', product.id);
    return { success: true, product };
  } catch (error: any) {
    console.error('--- updateProduct ERROR ---', error);
    return { success: false, message: 'Failed to update product: ' + error.message };
  }
}

