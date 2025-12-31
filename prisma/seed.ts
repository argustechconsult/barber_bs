
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';
import { PrismaClient, UserRole, UserPlan } from '../lib/generated/client/client';
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

  console.log('Seed executed: Users created/updated.');
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
