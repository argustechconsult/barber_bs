'use server';

import { prisma } from '../../lib/prisma';
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

    // 2. Faturamento (Total Revenue from PAID transactions linked to barber)
    // Includes: 
    // - Transactions linked to barber's appointments
    // - Manual income transactions linked to barber's userId
    const revenueResult = await prisma.transaction.aggregate({
        _sum: {
            amount: true
        },
        where: {
            status: 'PAID',
            OR: [
                { type: 'APPOINTMENT', appointment: { barberId }, user: { plan: 'START' } },
                { type: 'SUBSCRIPTION', user: { barbeiroId: barberId } },
                { userId: barberId, type: 'INCOME' }
            ]
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

    // 4. Receita Cortes (Service Revenue - Only START clients)
    const cutsRevenueResult = await prisma.transaction.aggregate({
        _sum: { amount: true },
        where: {
            status: 'PAID',
            type: 'APPOINTMENT',
            appointment: { barberId },
            user: { plan: 'START' }
        }
    });
    const cutsRevenue = cutsRevenueResult._sum.amount || 0;

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
// Helper to get last 6 months revenue
async function getMonthlyRevenue(barberId?: string) {
    const months = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthName = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
        const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);
        
        const where: any = {
            status: 'PAID',
            createdAt: {
                gte: d,
                lt: nextMonth
            }
        };

        if (barberId) {
            where.OR = [
                { type: 'APPOINTMENT', appointment: { barberId }, user: { plan: 'START' } },
                { type: 'SUBSCRIPTION', user: { barbeiroId: barberId } },
                { userId: barberId, type: 'INCOME' }
            ];
        }

        // Sum revenue for this month (Appointments + Manual Income)
        const revenue = await prisma.transaction.aggregate({
            _sum: { amount: true },
            where
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
    // 1. Receita de Cortes (Revenue from APPOINTMENT type PAID transactions)
    const cutsRevenueResult = await prisma.transaction.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        status: 'PAID',
        type: 'APPOINTMENT',
      },
    });
    const cutsRevenue = cutsRevenueResult._sum.amount || 0;

    // 2. Receita Total (All PAID transactions)
    const totalRevenueResult = await prisma.transaction.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        status: 'PAID',
      },
    });
    const totalRevenue = totalRevenueResult._sum.amount || 0;

    // 3. Vendas Market (SUBSCRIPTION type or manual marked as such)
    const marketRevenueResult = await prisma.transaction.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        status: 'PAID',
        productId: { not: null },
      },
    });
    const marketSales = marketRevenueResult._sum.amount || 0;

    // 4. Clientes por Plano
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
        cutsRevenue,
        totalRevenue,
        marketSales,
        planStats,
        totalClients,
        chartData: await getMonthlyRevenue(),
      },
    };
  } catch (error) {
    console.error('Get Admin Stats Error:', error);
    return { success: false, message: 'Failed to fetch admin stats' };
  }
}

export async function getFinancialStats(barberId?: string) {
  try {
    const where: any = { status: 'PAID' };

    if (barberId) {
      where.OR = [
        { type: 'APPOINTMENT', appointment: { barberId: barberId }, user: { plan: 'START' } },
        { type: 'SUBSCRIPTION', user: { barbeiroId: barberId } },
        { userId: barberId, type: { in: ['INCOME', 'EXPENSE'] } }
      ];
    }

    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      take: 50, // More items for financial view
    });

    const incomeResult = await prisma.transaction.aggregate({
      _sum: { amount: true },
      where: {
        ...where,
        type: { in: ['INCOME', 'APPOINTMENT', 'SUBSCRIPTION'] as any },
      },
    });

    const expenseResult = await prisma.transaction.aggregate({
      _sum: { amount: true },
      where: {
        ...where,
        type: 'EXPENSE',
      },
    });

    const marketResult = await prisma.transaction.aggregate({
      _sum: { amount: true },
      where: {
        ...where,
        productId: { not: null },
      },
    });

    const totalIncome = incomeResult._sum.amount || 0;
    const totalExpense = expenseResult._sum.amount || 0;
    const marketSales = marketResult._sum.amount || 0;

    return {
      success: true,
      stats: {
        transactions: transactions.map((t) => ({
          ...t,
          date: t.createdAt.toISOString().split('T')[0],
        })),
        totalIncome,
        totalExpense,
        marketSales,
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
      intervaloAtendimento: u.appointmentInterval || 10,
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
        // 1. Check for dependencies (Appointments or Transactions)
        // We check for ANY appointment (past/future) because we want to preserve history.
        // We also check for transactions where the user is the 'userId' (e.g. income) or linked via appointment.
        
        const hasAppointments = await prisma.appointment.count({
            where: { barberId: id }
        });

        const hasTransactions = await prisma.transaction.count({
            where: { userId: id }
        });

        if (hasAppointments > 0 || hasTransactions > 0) {
            // SOFT DELETE (Deactivate and Anonymize to release unique constraints)
            const timestamp = new Date().getTime();
            
            // Fetch current user to get email/whatsapp for anonymization logic if needed, 
            // or just append timestamp.
            const currentUser = await prisma.user.findUnique({
                where: { id },
                select: { email: true, whatsapp: true }
            });

            await prisma.user.update({
                where: { id },
                data: {
                    isActive: false,
                    // Release unique constraints
                    email: currentUser?.email ? `deleted_${timestamp}_${currentUser.email}` : undefined,
                    whatsapp: currentUser?.whatsapp ? `deleted_${timestamp}_${currentUser.whatsapp}` : undefined,
                    // Clear other potentially unique fields or sensitive data if necessary
                    inviteToken: null, 
                    // stripeCustomerId: null, 
                    // stripeSubscriptionId: null
                }
            });
            
            // Revalidate to update UI immediately
            const { revalidatePath } = await import('next/cache');
            revalidatePath('/');
            revalidatePath('/settings');
            
            return { success: true, message: 'Barbeiro desativado (histórico preservado)' };
        } else {
            // HARD DELETE (Safe to remove completely)
            await prisma.user.delete({
                where: { id }
            });
            
            const { revalidatePath } = await import('next/cache');
            revalidatePath('/');
            revalidatePath('/settings');

            return { success: true, message: 'Barbeiro excluído permanentemente' };
        }
    } catch (error: any) {
        console.error("Delete Barber Error:", error);
        return { success: false, message: "Erro ao excluir barbeiro: " + error.message };
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
    if (data.interval !== undefined) updateData.appointmentInterval = data.interval;
    if (data.startTime !== undefined) updateData.startTime = data.startTime;
    if (data.endTime !== undefined) updateData.endTime = data.endTime;
    if (data.workStartDate !== undefined) updateData.workStartDate = data.workStartDate;
    if (data.workEndDate !== undefined) updateData.workEndDate = data.workEndDate;
    if (data.offDays !== undefined) updateData.offDays = data.offDays;
    if (data.image !== undefined) updateData.image = data.image;

    await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });
    
    // Revalidate paths to ensure client app sees changes immediately
    const { revalidatePath } = await import('next/cache');
    revalidatePath('/');
    revalidatePath('/settings');

    return { success: true };
  } catch (error: any) {
    console.error('Update Barber Settings Error:', error);
    return { success: false, message: error.message || 'Failed to update settings' };
  }
}
