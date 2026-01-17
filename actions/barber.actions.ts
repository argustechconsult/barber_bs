'use server';

import { prisma } from '../lib/prisma';
import { subDays } from 'date-fns';

export async function getBarberStats(barberId: string) {
  try {
    const now = new Date();

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
            goalPercentage,
            chartData: await getMonthlyRevenue(barberId) // New real data
        }
    };

  } catch (error) {
    console.error('Get Barber Stats Error:', error);
    return { success: false, message: 'Failed to fetch stats' };
  }
}

// Helper to get last 6 months revenue
async function getMonthlyRevenue(barberId: string) {
    const months = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthName = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
        const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);
        
        // Sum revenue for this month
        const revenue = await prisma.transaction.aggregate({
            _sum: { amount: true },
            where: {
                status: 'PAID',
                createdAt: {
                    gte: d,
                    lt: nextMonth
                },
                appointment: {
                    barberId: barberId
                }
            }
        });

        months.push({
            name: monthName.charAt(0).toUpperCase() + monthName.slice(1),
            value: revenue._sum.amount || 0
        });
    }
    return months;
}

export async function getAdminStats() {
  try {
    // 1. Receita de Cortes (Total Revenue from PAID transactions)
    const revenueResult = await prisma.transaction.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        status: 'PAID',
      },
    });
    const totalRevenue = revenueResult._sum.amount || 0;

    // 2. Clientes por Plano
    const clientDistribution = await prisma.user.groupBy({
      by: ['plan'],
      where: {
        role: 'CLIENTE',
      },
      _count: {
        plan: true,
      },
    });

    const planStats = clientDistribution.map((item) => ({
      plan: item.plan,
      count: item._count.plan,
    }));

    const totalClients = await prisma.user.count({
      where: {
        role: 'CLIENTE',
      },
    });

    // 3. New indicators for Admin
    return {
      success: true,
      stats: {
        marketSales: 0, // Hardcoded as requested
        totalRevenue,
        planStats,
        totalClients,
      },
    };
  } catch (error) {
    console.error('Get Admin Stats Error:', error);
    return { success: false, message: 'Failed to fetch admin stats' };
  }
}

export async function getFinancialStats() {
  try {
    const transactions = await prisma.transaction.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      take: 20, // Limit for recent list
    });

    const income = await prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { type: 'INCOME', status: 'PAID' },
    });

    const expense = await prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { type: 'EXPENSE', status: 'PAID' },
    });

    const totalIncome = income._sum.amount || 0;
    const totalExpense = expense._sum.amount || 0;

    return {
      success: true,
      stats: {
        transactions: transactions.map((t) => ({
          ...t,
          date: t.createdAt.toISOString().split('T')[0], // Format date for UI
        })),
        totalIncome,
        totalExpense,
        netProfit: totalIncome - totalExpense,
      },
    };
  } catch (error) {
    console.error('Get Financial Stats Error:', error);
    return { success: false, message: 'Failed to fetch financial stats' };
  }
}

export async function createTransaction(data: {
  description: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  userId: string; // Required now
}) {
  try {
    const newTransaction = await prisma.transaction.create({
      data: {
        description: data.description,
        amount: data.amount,
        type: data.type,
        status: 'PAID', // Assume manual entries are paid/completed immediately
        createdAt: new Date(),
        userId: data.userId, // Link to admin user
      },
    });

    return { success: true, transaction: newTransaction };
  } catch (error) {
    console.error('Create Transaction Error:', error);
    return { success: false, message: 'Failed to create transaction' };
  }
}

export async function deleteTransaction(transactionId: string) {
  try {
    await prisma.transaction.delete({
      where: {
        id: transactionId,
      },
    });
    return { success: true };
  } catch (error) {
    console.error('Delete Transaction Error:', error);
    return { success: false, message: 'Failed to delete transaction' };
  }
}

export async function getBarbers() {
  try {
    const barbers = await prisma.user.findMany({
      where: {
        role: { in: ['BARBEIRO', 'ADMIN'] },
        isActive: true, // Only show active barbers? Or all? Let's show all active.
      },
    });

    const mappedBarbers = barbers.map((u) => ({
      id: u.id,
      nome: u.name,
      foto: u.image || u.whatsapp || '/default.jpeg', // Prefer image, then whatsapp (legacy), then default
      bio: '', 
      ativo: u.isActive,
      intervaloAtendimento: u.appointmentInterval || 30,
      horariosTrabalho: { 
          inicio: u.startTime || '09:00', 
          fim: u.endTime || '19:00' 
      },
      workStartDate: u.workStartDate,
      workEndDate: u.workEndDate,
      offDays: u.offDays,
    }));

    return { success: true, barbers: mappedBarbers };
  } catch (error) {
    console.error('Get Barbers Error:', error);
    return { success: false, barbers: [], message: 'Failed to fetch barbers' };
  }
}

export async function deleteBarber(id: string) {
    try {
        await prisma.user.delete({
            where: { id }
        });
        return { success: true };
    } catch (error) {
        console.error("Delete Barber Error:", error);
        return { success: false, message: "Erro ao excluir barbeiro" };
    }
}

export async function updateBarberSettings(
  userId: string,
  data: { 
      interval?: number; 
      startTime?: string; 
      endTime?: string;
      workStartDate?: string | null;
      workEndDate?: string | null;
      offDays?: string[];
      image?: string;
  }
) {
  try {
    const updateData: any = {};
    if (data.interval) updateData.appointmentInterval = data.interval;
    if (data.startTime) updateData.startTime = data.startTime;
    if (data.endTime) updateData.endTime = data.endTime;
    if (data.workStartDate !== undefined) updateData.workStartDate = data.workStartDate;
    if (data.workEndDate !== undefined) updateData.workEndDate = data.workEndDate;
    if (data.offDays !== undefined) updateData.offDays = data.offDays;
    if (data.image !== undefined) updateData.image = data.image;

    await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });
    
    // Revalidate paths to ensure client app sees changes immediately
    import('next/cache').then(({ revalidatePath }) => {
        revalidatePath('/');
    });

    return { success: true };
  } catch (error: any) {
    console.error('Update Barber Settings Error:', error);
    return { success: false, message: error.message || 'Failed to update settings' };
  }
}
