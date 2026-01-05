'use server';

import { prisma } from '../lib/prisma';
import { startOfMonth, endOfMonth, subDays } from 'date-fns';

export async function getBarberStats(barberId: string) {
  try {
    const now = new Date();
    const startOfCurrentMonth = startOfMonth(now);
    const endOfCurrentMonth = endOfMonth(now);

    // 1. Clientes Atendidos (Unique clients with successful appointments)
    const uniqueClients = await prisma.appointment.groupBy({
      by: ['clientId'],
      where: {
        barberId,
        status: { in: ['CONFIRMED', 'COMPLETED'] },
      },
    });
    const clientsServed = uniqueClients.length;

    // 2. Faturamento (Total Revenue from PAID transactions linked to barber's appointments)
    // Note: Transaction connects to Appointment, which connects to Barber.
    const revenueResult = await prisma.transaction.aggregate({
        _sum: {
            amount: true
        },
        where: {
            status: 'PAID',
            appointment: {
                barberId
            }
        }
    });
    const totalRevenue = revenueResult._sum.amount || 0;

    // 3. Média/Dia (Last 30 days)
    const thirtyDaysAgo = subDays(now, 30);
    const recentAppointments = await prisma.appointment.count({
        where: {
            barberId,
            date: { gte: thirtyDaysAgo },
            status: { in: ['CONFIRMED', 'COMPLETED'] }
        }
    });
    const averagePerDay = (recentAppointments / 30).toFixed(1);

    // 4. Receita Cortes (Service Revenue)
    // Currently same as total revenue as we only have appointments
    const cutsRevenue = totalRevenue;

    // 5. Goal Achievement (Mock logic or define a goal)
    // Let's assume a static goal for now or calculate based on something
    // For now: Mocked 82% to keep UI consistent or calculate against a target (e.g. 10k)
    const goalTarget = 10000;
    const goalPercentage = Math.min(Math.round((totalRevenue / goalTarget) * 100), 100);

    return {
        success: true,
        stats: {
            clientsServed,
            totalRevenue,
            averagePerDay,
            cutsRevenue,
            goalPercentage
        }
    };

  } catch (error) {
    console.error('Get Barber Stats Error:', error);
    return { success: false, message: 'Failed to fetch stats' };
  }
}
