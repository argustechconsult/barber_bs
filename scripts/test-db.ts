import 'dotenv/config';
import { prisma } from '../lib/prisma';

async function main() {
  console.log('Listing Barbers...');
  try {
    const barbers = await prisma.user.findMany({
        where: { role: 'BARBEIRO' }
    });
    console.log('Barbers found:', barbers.length);
    barbers.forEach(u => {
      console.log(`Barber: ${u.name} | ID: ${u.id} | Email: ${u.email}`);
    });
  } catch (error) {
    console.error('Connection failed:', error);
  } finally {
    process.exit();
  }
}

main();
