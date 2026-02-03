'use server';

import { prisma } from '../../lib/prisma';
import { UserRole } from '../../types';

export async function getBarbers() {
  try {
    const barbers = await prisma.user.findMany({
      where: {
        role: UserRole.BARBEIRO,
        isActive: true,
      },
    });

    // Map to frontend expectation if needed, or just return
    // Frontend expects: id, nome, foto, bio, ...
    // DB has: id, name, ...
    // We will have to mock the missing fields for now
    return barbers.map(b => ({
        id: b.id,
        nome: b.name,
        foto: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80', // Default placeholder
        bio: 'Barbeiro Profissional',
        intervaloAtendimento: 60,
        horariosTrabalho: { inicio: '09:00', fim: '19:00' },
        ativo: b.isActive
    }));
  } catch (error) {
    console.error('Error fetching barbers:', error);
    return [];
  }
}

export async function getUser(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    return user;
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
}
export async function updateUser(userId: string, data: { name?: string; image?: string; whatsapp?: string }) {
  try {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        name: data.name,
        image: data.image,
        whatsapp: data.whatsapp,
      },
    });
    return { success: true, user: updated };
  } catch (error) {
    console.error('Error updating user:', error);
    return { success: false, message: 'Falha ao atualizar perfil' };
  }
}

export async function getClients() {
  try {
    const clients = await prisma.user.findMany({
      where: {
        role: UserRole.CLIENTE,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return clients.map((c) => {
        let status = 'PAID'; // Default to PAID
        if (c.plan === 'PREMIUM') {
            if (c.subscriptionStatus === 'ACTIVE') status = 'PAID';
            else if (c.subscriptionStatus === 'PAST_DUE' || !c.subscriptionStatus) status = 'DEBT';
            else if (c.subscriptionStatus === 'CANCELLED') status = 'CHURN';
            else status = 'DEBT'; // Any other non-active premium status is debt
        }
        
        const lastRenewal = c.updatedAt.toLocaleDateString('pt-BR');

        return {
            id: c.id,
            name: c.name,
            email: c.email,
            whatsapp: c.whatsapp,
            role: c.role,
            plan: c.plan,
            isActive: c.isActive,
            status,
            lastRenewal,
            image: c.image
        };
    });
  } catch (error) {
    console.error('Error fetching clients:', error);
    return [];
  }
}

export async function getClientFullDetails(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        clientAppointments: {
          orderBy: { date: 'desc' },
          take: 10,
          include: {
              barber: true
          }
        },
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!user) return { success: false, message: 'Usuário não encontrado' };

    return {
      success: true,
      client: {
          ...user,
          appointments: user.clientAppointments.map(a => ({
              id: a.id,
              date: a.date.toISOString(),
              barberName: a.barber.name,
              status: a.status
          })),
          transactions: user.transactions.map(t => ({
              id: t.id,
              amount: t.amount,
              type: t.type,
              status: t.status,
              createdAt: t.createdAt.toISOString(),
              billingType: t.billingType,
              description: t.description
          }))
      }
    };
  } catch (error) {
    console.error('Error fetching client details:', error);
    return { success: false, message: 'Erro ao buscar detalhes' };
  }
}
