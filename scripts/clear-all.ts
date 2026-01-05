
import 'dotenv/config';
import { prisma } from '../lib/prisma';

async function main() {
  await prisma.transaction.deleteMany({});
  await prisma.appointment.deleteMany({});
  console.log('All appointments and transactions deleted.');
}

main();
