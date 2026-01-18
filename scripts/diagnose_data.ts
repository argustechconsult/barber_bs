import 'dotenv/config';
import { prisma } from '../lib/prisma';

async function main() {
  console.log('--- DATABASE DIAGNOSTIC ---\n');

  try {
    const userCount = await prisma.user.count();
    const appointmentCount = await prisma.appointment.count();
    const transactionCount = await prisma.transaction.count();

    console.log(`Total Users: ${userCount}`);
    console.log(`Total Appointments: ${appointmentCount}`);
    console.log(`Total Transactions: ${transactionCount}`);

    if (appointmentCount > 0) {
        const sampleAppointments = await prisma.appointment.findMany({ take: 5 });
        console.log('\nSample Appointments:', JSON.stringify(sampleAppointments, null, 2));
    }

    if (transactionCount > 0) {
        const sampleTransactions = await prisma.transaction.findMany({ take: 5 });
        console.log('\nSample Transactions:', JSON.stringify(sampleTransactions, null, 2));
    }

    const adminUsers = await prisma.user.findMany({ where: { role: 'ADMIN' } });
    console.log('\nAdmin Users:', adminUsers.map(u => u.name).join(', '));

    const barbers = await prisma.user.findMany({ where: { role: 'BARBEIRO' } });
    console.log('Barbers:', barbers.map(b => b.name).join(', '));

  } catch (error) {
    console.error('\nDiagnostic failed:', error);
  } finally {
    process.exit();
  }
}

main();
