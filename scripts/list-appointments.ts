import 'dotenv/config';
import { prisma } from '../lib/prisma';

async function main() {
  console.log('Listing Appointments...');
  try {
    const apps = await prisma.appointment.findMany({
        include: { barber: true, client: true }
    });
    console.log('Total Appointments:', apps.length);
    apps.forEach(a => {
      console.log(`ID: ${a.id} | Date: ${a.date.toISOString()} | Barber: ${a.barber.name} (${a.barberId}) | Client: ${a.client.name} | Status: ${a.status}`);
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit();
  }
}

main();
