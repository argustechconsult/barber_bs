import 'dotenv/config';
import { PrismaClient } from '../lib/generated/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

async function listBarbers() {
    const connectionString = `${process.env.DATABASE_URL}`;
    const pool = new Pool({ connectionString, ssl: true });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });

    const barbers = await prisma.user.findMany({
        where: { role: { in: ['BARBEIRO', 'ADMIN'] } }
    });

    console.log('--- BARBEIROS ENCONTRADOS ---');
    barbers.forEach(b => {
        console.log(`ID: ${b.id} | Nome: ${b.name} | Role: ${b.role}`);
    });

    await prisma.$disconnect();
}

listBarbers().catch(console.error);
