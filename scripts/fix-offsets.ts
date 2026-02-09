import { PrismaClient } from '../lib/generated/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

async function main() {
    const connectionString = `${process.env.DATABASE_URL}`;
    const pool = new Pool({ connectionString, ssl: true });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });

    console.log('--- CORRIGINDO AGENDAMENTOS COM OFFSET ERRADO ---');
    
    // Find appointments at 9:00 AM UTC on 2026-02-05 (which should be 12:00 PM UTC)
    // and any others at 9 AM UTC that might be common candidates for this error if scheduled at 9 AM local.
    const targetDate = new Date('2026-02-05T09:00:00.000Z');
    
    const affected = await prisma.appointment.findMany({
        where: {
            date: targetDate
        }
    });

    console.log(`Encontrados ${affected.length} agendamentos afetados.`);

    for (const app of affected) {
        const newDate = new Date(app.date);
        newDate.setUTCHours(newDate.getUTCHours() + 3);
        
        await prisma.appointment.update({
            where: { id: app.id },
            data: { date: newDate }
        });
        console.log(`Atualizado ID: ${app.id} para ${newDate.toISOString()}`);
    }

    // Also check for 2026-02-01T09:00:00.000Z as seen in logs
    const targetDate2 = new Date('2026-02-01T09:00:00.000Z');
    const affected2 = await prisma.appointment.findMany({
        where: {
            date: targetDate2
        }
    });
    
    for (const app of affected2) {
        const newDate = new Date(app.date);
        newDate.setUTCHours(newDate.getUTCHours() + 3);
        
        await prisma.appointment.update({
            where: { id: app.id },
            data: { date: newDate }
        });
        console.log(`Atualizado ID: ${app.id} para ${newDate.toISOString()}`);
    }

    console.log('--- FIM DA CORREÇÃO ---');
    await prisma.$disconnect();
}

main().catch(console.error);
