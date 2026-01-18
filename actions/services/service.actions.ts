'use server';

import { prisma } from '../../lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getServices() {
    try {
        const services = await prisma.service.findMany({
            orderBy: { price: 'asc' }
        });
        return { success: true, services };
    } catch (error) {
        console.error('Get Services Error:', error);
        return { success: false, services: [] };
    }
}

export async function createService(data: { name: string; price: number }) {
    try {
        const service = await prisma.service.create({
            data: {
                name: data.name,
                price: data.price,
                duration: 30, // Default duration
            }
        });
        revalidatePath('/settings');
        return { success: true, service };
    } catch (error) {
        console.error('Create Service Error:', error);
        return { success: false, message: 'Failed to create service' };
    }
}

export async function updateService(id: string, data: { price?: number; name?: string }) {
    try {
        const service = await prisma.service.update({
            where: { id },
            data: { 
                ...(data.price !== undefined && { price: data.price }),
                ...(data.name !== undefined && { name: data.name })
            }
        });

        revalidatePath('/settings'); 
        return { success: true, service };
    } catch (error) {
        console.error('Update Service Error:', error);
        return { success: false, message: 'Failed to update service' };
    }
}

export async function deleteService(id: string) {
    try {
        await prisma.service.delete({ where: { id } });
        revalidatePath('/settings');
        return { success: true };
    } catch (error) {
        console.error('Delete Service Error:', error);
        return { success: false, message: 'Failed to delete service' };
    }
}
