import 'dotenv/config';
import { prisma } from '../lib/prisma';

async function main() {
  console.log('--- [Subscription Compliance Check] ---');
  const now = new Date();
  console.log(`Current Time: ${now.toISOString()}`);

  try {
    // 1. Find all PREMIUM users
    const premiumUsers = await prisma.user.findMany({
      where: {
        plan: 'PREMIUM',
        role: 'CLIENTE',
        isActive: true,
      },
      include: {
        transactions: {
          where: {
            status: 'PAID',
            type: 'SUBSCRIPTION',
          },
          orderBy: {
            expiration_date: 'desc',
          },
          take: 1,
        },
      },
    });

    console.log(`Found ${premiumUsers.length} active PREMIUM users to check.`);

    let downgradedCount = 0;

    for (const user of premiumUsers) {
      const latestSubscription = user.transactions[0];
      
      let isExpired = false;

      if (!latestSubscription) {
        console.log(`User ${user.name} (${user.email}) has NO paid subscriptions. Downgrading...`);
        isExpired = true;
      } else if (latestSubscription.expiration_date && latestSubscription.expiration_date < now) {
        console.log(`User ${user.name} (${user.email}) subscription EXPIRED on ${latestSubscription.expiration_date.toISOString()}. Downgrading...`);
        isExpired = true;
      }

      if (isExpired) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            plan: 'START',
            subscriptionStatus: 'INADIMPLENTE', // Or 'EXPIRED'
          },
        });
        downgradedCount++;
      } else {
        console.log(`User ${user.name} (${user.email}) is compliant until ${latestSubscription.expiration_date?.toISOString()}.`);
      }
    }

    console.log('----------------------------------------');
    console.log(`Check complete. Total downgraded: ${downgradedCount}`);
    
  } catch (error) {
    console.error('Compliance Check Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
