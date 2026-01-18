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

    // Simple conflict check: check if barber has an appointment at roughly the same time (assuming 1h slots for simplicity for now)
    // ideally strict range check
    // Check for PREMIUM plan restrictions
    const client = await prisma.user.findUnique({
        where: { id: clientId },
        select: { plan: true, subscriptionStatus: true }
    });

    if (client?.plan === 'PREMIUM' && client.subscriptionStatus !== 'ACTIVE') {
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
        // Allow retry if it's the same user and status is PENDING (e.g. failed payment retry)
        if (existing.clientId === clientId && existing.status === 'PENDING') {
             // Update services just in case they changed selection
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
    // Return times that are occupied
    try {
        // Enforce UTC day range
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

        // We need to return specific times "HH:mm"
        const occupiedTimes = appointments.map(app => {
            const d = new Date(app.date);
            // Since we stored it as ISO (UTC), we should probably extract UTC hours if we want consistency
            // Assuming simplified slot logic where input is naive. 
            // If createAppointment used 'T13:00:00', Prisma stored it.
            // When we read back '2026-01-02T13:00:00.000Z' (as seen in list-appointments)
            // d.getUTCHours() will be 13. d.getHours() will be 10 (GMT-3).
            
            // To be consistent with how we created it (assuming user selected 13:00 in UI):
            // We want to return '13:00'.
            // So we should use getUTCHours() if we treat the stored date as "UTC representation of the slot".
            
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
            include: { barber: true }, // Include barber name
            orderBy: { date: 'desc' }
        });

        const formatted = appointments.map(app => ({
            id: app.id,
            clientId: app.clientId,
            clientName: app.barber.name, // Actually this should be barbers name for client view
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
        // Enforce UTC day range to avoid local timezone shifts
        // dateStr is 'YYYY-MM-DD'
        const start = new Date(`${dateStr}T00:00:00.000Z`);
        const end = new Date(`${dateStr}T23:59:59.999Z`);

        const appointments = await prisma.appointment.findMany({
            where: {
                barberId,
                date: {
                    gte: start,
                    lte: end
                },
                // Only show confirmed or completed appointments in the agenda view.
                // PENDING appointments (waiting for payment) block the slot but don't show here.
                status: { in: ['CONFIRMED', 'COMPLETED'] }
            },
            include: {
                client: true // Include client details (name, etc)
            },
            orderBy: { date: 'asc' }
        });

        return { success: true, appointments };
    } catch (error) {
        console.error('Get Barber Schedule Error:', error);
        return { success: false, appointments: [] };
    }
}
