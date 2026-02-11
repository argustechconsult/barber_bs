import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', {
      status: 401,
    });
  }

  console.log('--- [Subscription Compliance Check - Cron] ---');
  const now = new Date();
  
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
            subscriptionStatus: 'INADIMPLENTE',
          },
        });
        downgradedCount++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      checked: premiumUsers.length, 
      downgraded: downgradedCount 
    });

  } catch (error) {
    console.error('Compliance Check Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
