import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/client';

const connectionString = process.env.DATABASE_URL;

console.log('--- PRISMA DEBUG ---');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DATABASE_URL defined:', !!connectionString);
if (connectionString) {
    console.log('DATABASE_URL host:', connectionString.split('@')[1]?.split('/')[0]);
}
console.log('--------------------');

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
