import 'dotenv/config';
import { prisma } from '../lib/prisma';
import { UserRole } from '../types';

async function main() {
  console.log('--- SEEDING TEST DATA FOR DASHBOARD ---');

  const jorge = await prisma.user.findFirst({ where: { name: 'Jorge o Barbeiro' } });
  const admin = await prisma.user.findFirst({ where: { name: 'Barbeiro Administrador' } });
  const cliente = await prisma.user.findFirst({ where: { role: 'CLIENTE' } });

  if (!jorge || !admin || !cliente) {
    console.error('Missing required users for seeding. Run separate user seed first.');
    return;
  }

  console.log(`Using Jorge (Barber): ${jorge.id}`);
  console.log(`Using Admin: ${admin.id}`);
  console.log(`Using Client: ${cliente.id}`);

  // 1. Create a Service
  let service = await prisma.service.findFirst();
  if (!service) {
      service = await prisma.service.create({
          data: { name: 'Corte Moderno', price: 50.0, duration: 30 }
      });
  }

  // 2. Create Appointments for Jorge
  console.log('Creating appointments for Jorge...');
  const app1 = await prisma.appointment.create({
    data: {
      date: new Date(),
      clientId: cliente.id,
      barberId: jorge.id,
      serviceIds: service.id,
      status: 'COMPLETED'
    }
  });

  const app2 = await prisma.appointment.create({
    data: {
      date: new Date(Date.now() - 86400000), // yesterday
      clientId: cliente.id,
      barberId: jorge.id,
      serviceIds: service.id,
      status: 'CONFIRMED'
    }
  });

  // 3. Create PAID Transactions for these appointments
  console.log('Creating transactions...');
  await prisma.transaction.create({
    data: {
      amount: 50.0,
      status: 'PAID',
      type: 'APPOINTMENT',
      userId: jorge.id,
      appointmentId: app1.id,
      description: 'Corte Moderno - Jorge'
    }
  });

  await prisma.transaction.create({
    data: {
      amount: 50.0,
      status: 'PAID',
      type: 'APPOINTMENT',
      userId: jorge.id,
      appointmentId: app2.id,
      description: 'Corte Moderno - Jorge'
    }
  });

  // 4. Create a Manual Income for Jorge
  await prisma.transaction.create({
    data: {
      amount: 100.0,
      status: 'PAID',
      type: 'INCOME',
      userId: jorge.id,
      description: 'Dica Extra'
    }
  });

  // 5. Create a Market Sale (SUBSCRIPTION) for Admin
  await prisma.transaction.create({
    data: {
      amount: 200.0,
      status: 'PAID',
      type: 'SUBSCRIPTION',
      userId: admin.id,
      description: 'Venda de Pomada (Marketplace)'
    }
  });

  console.log('Seed completed successfully!');
  process.exit();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
