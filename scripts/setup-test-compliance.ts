import 'dotenv/config';
import { prisma } from '../lib/prisma';
import { subDays } from 'date-fns';

async function main() {
  console.log('--- [Setting up Test Data for Compliance Check] ---');

  try {
    // 1. Create or find a test user
    const userEmail = 'test-compliance@example.com';
    let testUser = await prisma.user.findUnique({ where: { email: userEmail } });

    if (!testUser) {
      testUser = await prisma.user.create({
        data: {
          name: 'Test Compliance User',
          email: userEmail,
          whatsapp: '11912345678_test',
          role: 'CLIENTE',
          plan: 'PREMIUM',
          isActive: true,
        },
      });
      console.log('Created test user.');
    } else {
      await prisma.user.update({
        where: { id: testUser.id },
        data: { plan: 'PREMIUM', isActive: true },
      });
      console.log('Reset test user to PREMIUM.');
    }

    // 2. Create an EXPIRED subscription transaction
    const expiredDate = subDays(new Date(), 5);
    await prisma.transaction.create({
      data: {
        amount: 29.90,
        type: 'SUBSCRIPTION',
        status: 'PAID',
        userId: testUser.id,
        expiration_date: expiredDate,
        description: 'Test Expired Subscription',
      },
    });

    console.log(`Created expired transaction (Expired on: ${expiredDate.toISOString()})`);
    console.log('Setup complete. Now run: npx tsx scripts/check-compliance.ts');

  } catch (error) {
    console.error('Setup Test Data Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
