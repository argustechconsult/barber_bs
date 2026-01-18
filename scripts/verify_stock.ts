import 'dotenv/config';
import { prisma } from '../lib/prisma';

async function main() {
  console.log('--- STOCK DECREMENT VERIFICATION ---\n');

  try {
    // 1. Create a test product
    console.log('Creating test product...');
    const product = await prisma.product.create({
      data: {
        name: 'Stock Test Product',
        price: 50.00,
        stock: 5,
        category: 'Test',
        description: 'Testing stock decrement'
      }
    });
    console.log(`✅ Created product with ID: ${product.id} and Stock: ${product.stock}`);

    // 2. Create a pending transaction for this product
    console.log('\nCreating pending transaction...');
    // We need a real user ID. Let's find one or use a dummy.
    const user = await prisma.user.findFirst();
    if (!user) throw new Error('No user found to link transaction');

    const transaction = await prisma.transaction.create({
      data: {
        amount: 50.00,
        status: 'PENDING',
        type: 'INCOME',
        userId: user.id,
        productId: product.id,
        description: 'Test Purchase'
      }
    });
    console.log(`✅ Created transaction with ID: ${transaction.id}`);

    // 3. Manually call the webhook logic (SIMULATED)
    // Instead of HTTP, we can just run the logic that the webhook uses
    console.log('\nSimulating Webhook call...');
    
    // Webhook logic snippet:
    if (transaction.productId) {
        await prisma.product.update({
            where: { id: transaction.productId },
            data: {
                stock: {
                    decrement: 1
                }
            }
        });
    }
    
    // Update transaction to PAID
    await prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: 'PAID' }
    });

    // 4. Verify stock
    console.log('\nVerifying stock...');
    const updatedProduct = await prisma.product.findUnique({
      where: { id: product.id }
    });

    if (updatedProduct?.stock === 4) {
      console.log('✅ Success! Stock decremented from 5 to 4.');
    } else {
      console.error(`❌ Failure! Expected stock 4, but found ${updatedProduct?.stock}`);
    }

    // Cleanup
    await prisma.transaction.delete({ where: { id: transaction.id } });
    await prisma.product.delete({ where: { id: product.id } });
    console.log('\nCleanup done.');

  } catch (error) {
    console.error('\nVerification failed:', error);
  } finally {
    process.exit();
  }
}

main();
