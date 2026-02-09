import { PrismaClient } from '../lib/generated/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

async function main() {
    const connectionString = `${process.env.DATABASE_URL}`;
    const pool = new Pool({ connectionString, ssl: true });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });

    console.log('--- BUSCANDO AGENDAMENTOS RECENTES ---');
    const appointments = await prisma.appointment.findMany({
        orderBy: { createdAt: 'desc' },
        take: 3,
        include: {
            client: { select: { name: true, email: true } },
            barber: { select: { name: true } },
            transaction: true
        }
    });

    appointments.forEach(app => {
        console.log(`ID: ${app.id}`);
        console.log(`Cliente: ${app.client.name}`);
        console.log(`Barbeiro: ${app.barber.name}`);
        console.log(`Data Agendada (UTC): ${app.date.toISOString()}`);
        console.log(`Data Agendada (Local/SP): ${new Date(app.date).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`);
        console.log(`Status: ${app.status}`);
        console.log(`Transação ID: ${app.transaction?.id || 'N/A'}`);
        console.log(`Transação Status: ${app.transaction?.status || 'N/A'}`);
        console.log(`Transação Criada em (UTC): ${app.transaction?.createdAt.toISOString() || 'N/A'}`);
        console.log('-----------------------------------');
    });

    await prisma.$disconnect();
}

main().catch(console.error);
