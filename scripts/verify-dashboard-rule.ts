import { prisma } from '../lib/prisma';
import { getBarberStats } from '../actions/users/barber.actions';
import { UserRole, UserPlan } from '../types';
// TransactionType and TransactionStatus are used as string literals to avoid import issues

async function verifyRule() {
  console.log('--- Iniciando Verificação da Regra de Negócio ---');

  // 1. Setup Mock Barber
  const barber = await prisma.user.create({
    data: {
      name: 'Barbeiro Teste Regra',
      email: `barber_${Date.now()}@test.com`,
      role: UserRole.BARBEIRO,
      isActive: true,
    }
  });

  // 2. Setup Mock Premium Client linked to Barber
  const premiumClient = await prisma.user.create({
    data: {
      name: 'Cliente Premium Teste',
      email: `premium_${Date.now()}@test.com`,
      role: UserRole.CLIENTE,
      plan: UserPlan.PREMIUM,
      barbeiroId: barber.id,
    }
  });

  // 3. Setup Mock Start Client
  const startClient = await prisma.user.create({
    data: {
      name: 'Cliente Start Teste',
      email: `start_${Date.now()}@test.com`,
      role: UserRole.CLIENTE,
      plan: UserPlan.START,
    }
  });

  // 4. Create Transactions
  
  // A. Premium Client Appointment (Should be EXCLUDED from Barber Revenue)
  const premiumAppointment = await prisma.appointment.create({
    data: {
      date: new Date(),
      clientId: premiumClient.id,
      barberId: barber.id,
      serviceIds: 'service_1',
      status: 'CONFIRMED',
    }
  });
  await prisma.transaction.create({
    data: {
      amount: 50.00,
      status: 'PAID',
      type: 'APPOINTMENT',
      userId: premiumClient.id,
      appointmentId: premiumAppointment.id,
      description: 'Corte Premium (Não deve contar)',
    }
  });

  // B. Premium Client Subscription (Should be INCLUDED in Barber Revenue because linked via barbeiroId)
  await prisma.transaction.create({
    data: {
      amount: 150.00,
      status: 'PAID',
      type: 'SUBSCRIPTION',
      userId: premiumClient.id,
      description: 'Mensalidade VIP (Deve contar)',
    }
  });

  // C. Start Client Appointment (Should be INCLUDED in Barber Revenue)
  const startAppointment = await prisma.appointment.create({
    data: {
      date: new Date(),
      clientId: startClient.id,
      barberId: barber.id,
      serviceIds: 'service_2',
      status: 'CONFIRMED',
    }
  });
  await prisma.transaction.create({
    data: {
      amount: 40.00,
      status: 'PAID',
      type: 'APPOINTMENT',
      userId: startClient.id,
      appointmentId: startAppointment.id,
      description: 'Corte Start (Deve contar)',
    }
  });

  // 5. Check Stats
  const res = await getBarberStats(barber.id);
  
  if (res.success && res.stats) {
    console.log('Resultados do Dashboard:');
    console.log(`- Faturamento Total: R$ ${res.stats.totalRevenue}`);
    console.log(`- Receita de Cortes (Só Start): R$ ${res.stats.cutsRevenue}`);
    
    // Expectation: 150 (Subscription) + 40 (Start Appointment) = 190
    // Cuts Expectation: 40 (Start Appointment)
    
    const expectedTotal = 190.00;
    const expectedCuts = 40.00;

    if (res.stats.totalRevenue === expectedTotal && res.stats.cutsRevenue === expectedCuts) {
      console.log('✅ SUCESSO: A regra de negócio está funcionando corretamente!');
    } else {
      console.error('❌ ERRO: Os valores não batem com o esperado.');
      console.error(`Esperado Total: ${expectedTotal}, Obtido: ${res.stats.totalRevenue}`);
      console.error(`Esperado Cortes: ${expectedCuts}, Obtido: ${res.stats.cutsRevenue}`);
    }
  } else {
    console.error('Falha ao obter stats do barbeiro', res.message);
  }

  // Cleanup (Optional but good for test scripts)
  // await prisma.transaction.deleteMany({ where: { userId: { in: [premiumClient.id, startClient.id] } } });
  // await prisma.appointment.deleteMany({ where: { barberId: barber.id } });
  // await prisma.user.deleteMany({ where: { id: { in: [barber.id, premiumClient.id, startClient.id] } } });
}

verifyRule().catch(console.error).finally(() => prisma.$disconnect());
