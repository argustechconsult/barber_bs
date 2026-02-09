import 'dotenv/config';
import { PrismaClient } from '../lib/generated/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

async function test() {
    const connectionString = `${process.env.DATABASE_URL}`;
    const pool = new Pool({ connectionString, ssl: true });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });

    console.log('--- CHECKING APPOINTMENTS AND TRANSACTIONS FOR 2026-02-05 ---');
    const appointments = await prisma.appointment.findMany({
        where: {
            date: {
                gte: new Date('2026-02-05T00:00:00Z'),
                lte: new Date('2026-02-05T23:59:59Z')
            }
        },
        include: {
            transaction: true,
            client: { select: { name: true, email: true } }
        }
    });

    appointments.forEach(app => {
        console.log(`\nAppointment ID: ${app.id}`);
        console.log(`Status: ${app.status}`);
        console.log(`Client: ${app.client.name} (${app.client.email})`);
        console.log(`Date: ${app.date.toISOString()}`);
        if (app.transaction) {
            console.log(`Transaction ID: ${app.transaction.id}`);
            console.log(`Transaction Status: ${app.transaction.status}`);
            console.log(`InfinitePay order NSU: ${app.transaction.infinitePayOrderNSU}`);
            console.log(`InfinitePay transaction NSU: ${app.transaction.infinitePayTransactionNSU}`);
        } else {
            console.log('Transaction: NONE');
        }
    });

    console.log('\n--- CHECKING ALL RECENT TRANSACTIONS ---');
    const transactions = await prisma.transaction.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { appointment: true, user: true }
    });

    transactions.forEach(t => {
        console.log(`\nTransaction ID: ${t.id}`);
        console.log(`Created At: ${t.createdAt.toISOString()}`);
        console.log(`Status: ${t.status}`);
        console.log(`Type: ${t.type}`);
        console.log(`User: ${t.user.name}`);
        console.log(`Appointment ID: ${t.appointmentId || 'N/A'}`);
        console.log(`InfinitePay Order NSU: ${t.infinitePayOrderNSU || 'N/A'}`);
    });

    await prisma.$disconnect();
}

test().catch(console.error);
