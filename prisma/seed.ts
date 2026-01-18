
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
  const passwordAdmin = await bcrypt.hash('123456', 10);
  const passwordStart = await bcrypt.hash('123456', 10);
  const passwordPremium = await bcrypt.hash('123456', 10);

  // Admin
  await prisma.user.upsert({
    where: { email: 'admin@email.com' },
    update: {},
    create: {
      name: 'Barbeiro Administrador',
      email: 'admin@email.com',
      password: passwordAdmin,
      role: UserRole.ADMIN,
      isActive: true,
    },
  });

  // Start User
  await prisma.user.upsert({
    where: { email: 'start@email.com' },
    update: {},
    create: {
      name: 'User Start',
      email: 'start@email.com',
      password: passwordStart,
      role: UserRole.CLIENTE,
      plan: UserPlan.START,
      isActive: true,
    },
  });

  // Premium User
  await prisma.user.upsert({
    where: { email: 'premium@email.com' },
    update: {},
    create: {
      name: 'User Premium',
      email: 'premium@email.com',
      password: passwordPremium,
      role: UserRole.CLIENTE,
      plan: UserPlan.PREMIUM,
      isActive: true,
    },
  });

  // Barbeiro
  const barber = await prisma.user.upsert({
    where: { email: 'barbeiro@email.com' },
    update: {},
    create: {
      name: 'Jorge o Barbeiro',
      email: 'barbeiro@email.com',
      password: passwordAdmin,
      role: UserRole.BARBEIRO,
      isActive: true,
      // Barbers link to themselves or can be linked by clients
    },
  });

  // Services
  await prisma.service.createMany({
    data: [
      { name: 'Corte de Cabelo', price: 1000, duration: 45 },
      { name: 'Barba Completa', price: 1000, duration: 30 },
      { name: 'Corte + Barba', price: 1000, duration: 60 },
      { name: 'Acabamento/Pezinho', price: 1000, duration: 15 },
    ],
    skipDuplicates: true,
  });

  console.log('Seed executed: Users, Barbers, Services created.');
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
