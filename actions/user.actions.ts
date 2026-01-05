'use server';

import { prisma } from '../lib/prisma';
import { UserRole } from '../types';

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
