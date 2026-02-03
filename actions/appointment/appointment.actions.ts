'use server';

import { prisma } from '../../lib/prisma';
import { Appointment } from '../../types';
import { revalidatePath } from 'next/cache';

export interface CreateAppointmentData {
  clientId: string;
  barberId: string;
  date: string; // ISO String
  serviceIds: string[];
}

export async function createAppointment(data: CreateAppointmentData) {
  try {
    const { clientId, barberId, date, serviceIds } = data;
    const appointmentDate = new Date(date);

    const client = await prisma.user.findUnique({
        where: { id: clientId },
        select: { id: true, plan: true, subscriptionStatus: true }
    });

    if (!client) {
        console.error(`[Prisma Error Prevention] Client not found: ${clientId}`);
        return { success: false, message: 'Usuário não encontrado. Por favor, faça logout e login novamente.' };
    }

    if (client.plan === 'PREMIUM' && client.subscriptionStatus !== 'ACTIVE') {
         return { success: false, message: 'Assinatura Premium inativa. Regularize seu pagamento.' };
    }

    const existing = await prisma.appointment.findFirst({
        where: {
            barberId,
            date: appointmentDate,
            status: { not: 'CANCELLED' }
        }
    });

    if (existing) {
        if (existing.clientId === clientId && existing.status === 'PENDING') {
             const updated = await prisma.appointment.update({
                 where: { id: existing.id },
                 data: { serviceIds: serviceIds.join(',') }
             });
             return { success: true, appointment: updated };
        }
        return { success: false, message: 'Horário indisponível.' };
    }

    const appointment = await prisma.appointment.create({
      data: {
        date: appointmentDate,
        clientId,
        barberId,
        serviceIds: serviceIds.join(','),
        status: client?.plan === 'PREMIUM' && client.subscriptionStatus === 'ACTIVE' ? 'CONFIRMED' : 'PENDING'
      }
    });

    revalidatePath('/agenda');
    return { success: true, appointment };
  } catch (error) {
    console.error('Create Appointment Error:', error);
    return { success: false, message: 'Erro ao criar agendamento.' };
  }
}

export async function getAppointmentsByBarber(barberId: string, dateStr: string) {
    try {
        const start = new Date(`${dateStr}T00:00:00.000Z`);
        const end = new Date(`${dateStr}T23:59:59.999Z`);

        const appointments = await prisma.appointment.findMany({
            where: {
                barberId,
                date: {
                    gte: start,
                    lte: end
                },
                status: { not: 'CANCELLED' }
            }
        });

        const occupiedTimes = appointments.map(app => {
            const d = new Date(app.date);
            const hours = d.getUTCHours().toString().padStart(2, '0');
            const minutes = d.getUTCMinutes().toString().padStart(2, '0');
            return `${hours}:${minutes}`;
        });
        
        return { success: true, occupiedTimes };
    } catch (error) {
        console.error('Get Appointments Error:', error);
        return { success: false, occupiedTimes: [] };
    }
}

export async function getMyAppointments(userId: string) {
    try {
        const appointments = await prisma.appointment.findMany({
            where: { clientId: userId },
            include: { barber: true },
            orderBy: { date: 'desc' }
        });

        const formatted = appointments.map(app => ({
            id: app.id,
            clientId: app.clientId,
            clientName: app.barber.name,
            barberId: app.barberId,
            serviceIds: app.serviceIds, 
            date: app.date.toISOString(),
            status: app.status as any
        }));

        return { success: true, appointments: formatted };
    } catch (error) {
        return { success: false, appointments: [] };
    }
}

export async function getBarberSchedule(barberId: string, dateStr: string) {
    try {
        const start = new Date(`${dateStr}T00:00:00.000Z`);
        const end = new Date(`${dateStr}T23:59:59.999Z`);

        const where: any = {
            date: {
                gte: start,
                lte: end
            },
            status: { in: ['CONFIRMED', 'COMPLETED'] }
        };

        if (barberId && barberId !== 'ALL') {
            where.barberId = barberId;
        }

        const appointments = await prisma.appointment.findMany({
            where,
            include: {
                client: true,
                barber: true
            },
            orderBy: { date: 'asc' }
        });

        return { success: true, appointments };
    } catch (error) {
        console.error('Get Barber Schedule Error:', error);
        return { success: false, appointments: [] };
    }
}
