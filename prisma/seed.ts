
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';
import { PrismaClient, UserRole, UserPlan } from '../lib/generated/client';
import bcrypt from 'bcrypt';

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString, ssl: true });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordAdmin = await bcrypt.hash('admin', 10);
  const passwordStart = await bcrypt.hash('start', 10);
  const passwordPremium = await bcrypt.hash('premium', 10);

  // Admin
  await prisma.user.upsert({
    where: { email: 'admin' },
    update: {},
    create: {
      name: 'Barbeiro Administrador',
      email: 'admin',
      password: passwordAdmin,
      role: UserRole.ADMIN,
      isActive: true,
    },
  });

  // Start User
  await prisma.user.upsert({
    where: { email: 'start' },
    update: {},
    create: {
      name: 'User Start',
      email: 'start',
      password: passwordStart,
      role: UserRole.CLIENTE,
      plan: UserPlan.START,
      isActive: true,
    },
  });

  // Premium User
  await prisma.user.upsert({
    where: { email: 'premium' },
    update: {},
    create: {
      name: 'User Premium',
      email: 'premium',
      password: passwordPremium,
      role: UserRole.CLIENTE,
      plan: UserPlan.PREMIUM,
      isActive: true,
    },
  });

  // Barbeiro
  const barber = await prisma.user.upsert({
    where: { email: 'barbeiro' },
    update: {},
    create: {
      name: 'Jorge o Barbeiro',
      email: 'barbeiro',
      password: passwordAdmin,
      role: UserRole.BARBEIRO,
      isActive: true,
      // Barbers link to themselves or can be linked by clients
    },
  });

  // Services
  await prisma.service.createMany({
    data: [
      { name: 'Corte de Cabelo', price: 50.0, duration: 45 },
      { name: 'Barba Completa', price: 35.0, duration: 30 },
      { name: 'Corte + Barba', price: 75.0, duration: 60 },
      { name: 'Acabamento/Pezinho', price: 20.0, duration: 15 },
    ],
    skipDuplicates: true,
  });

  // Products
  await prisma.product.createMany({
      data: [
          { name: 'Pomada Efeito Matte', description: 'Alta fixação e efeito seco', category: 'Cabelo', price: 45.0 },
          { name: 'Óleo para Barba', description: 'Hidratação e maciez', category: 'Barba', price: 30.0 },
          { name: 'Shampoo Mentolado', description: 'Limpeza refrescante', category: 'Cabelo', price: 35.0 },
      ],
      skipDuplicates: true
  });

  console.log('Seed executed: Users, Barbers, Services, and Products created.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
