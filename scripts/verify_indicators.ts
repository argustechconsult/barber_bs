import 'dotenv/config';
import { prisma } from '../lib/prisma';
import { getAdminStats, getBarberStats } from '../actions/users/barber.actions';

async function main() {
  console.log('--- DASHBOARD INDICATOR VERIFICATION ---\n');

  try {
    // 1. Admin Verification
    console.log('>>> ADMIN DASHBOARD STATS:');
    const adminRes = await getAdminStats();
    if (adminRes.success && adminRes.stats) {
      const s = adminRes.stats;
      console.log(`- Total Revenue: R$ ${s.totalRevenue.toFixed(2)}`);
      console.log(`- Cuts Revenue: R$ ${s.cutsRevenue.toFixed(2)}`);
      console.log(`- Market Sales: R$ ${s.marketSales.toFixed(2)}`);
      console.log(`- Total Clients: ${s.totalClients}`);
      console.log('- Plan Distribution:');
      s.planStats.forEach((p: any) => console.log(`  * ${p.plan}: ${p.count}`));
      console.log('- Chart Data (Recent):', s.chartData.map((d: any) => `${d.name}: ${d.value}`).join(' | '));
    } else {
      console.error('Failed to fetch Admin stats:', adminRes.message);
    }

    console.log('\n----------------------------------------\n');

    // 2. Barber Verification (Get all barbers and individual stats)
    console.log('>>> BARBER DASHBOARD STATS:');
    const barbers = await prisma.user.findMany({
      where: { role: { in: ['BARBEIRO', 'ADMIN'] }, isActive: true }
    });

    for (const b of barbers) {
      console.log(`\n> Barber: ${b.name} (Role: ${b.role})`);
      const barberRes = await getBarberStats(b.id);
      if (barberRes.success && barberRes.stats) {
        const s = barberRes.stats;
        console.log(`  - Clients Served: ${s.clientsServed}`);
        console.log(`  - Total Revenue: R$ ${s.totalRevenue.toFixed(2)}`);
        console.log(`  - Average/Day: ${s.averagePerDay}`);
        console.log(`  - Goal Achievement: ${s.goalPercentage}%`);
        console.log(`  - Revenue Chart:`, s.chartData.map((d: any) => `${d.name}: ${d.value}`).join(' | '));
      } else {
        console.error(`  - Failed to fetch stats for ${b.name}:`, barberRes.message);
      }
    }

  } catch (error) {
    console.error('\nVerification failed:', error);
  } finally {
    process.exit();
  }
}

main();
