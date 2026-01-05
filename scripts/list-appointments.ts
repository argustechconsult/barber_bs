
import { prisma } from '../lib/prisma';

async function main() {
  const appointments = await prisma.appointment.findMany({
    include: { client: true, barber: true }
  });
  console.log('Appointments:', JSON.stringify(appointments, null, 2));
}

main();
