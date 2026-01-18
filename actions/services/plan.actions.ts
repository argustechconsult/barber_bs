'use server';

import { prisma } from '../../lib/prisma';

export async function getPlans() {
  try {
    const plans = await prisma.plan.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return { success: true, plans };
  } catch (error) {
    console.error('Get Plans Error:', error);
    return { success: false, message: 'Failed to fetch plans' };
  }
}

export async function createPlan(data: { name: string; price: number }) {
  try {
    const plan = await prisma.plan.create({
      data: {
        name: data.name,
        price: data.price
      }
    });
    return { success: true, plan };

  } catch (error) {
    console.error('Create Plan Error:', error);
    return { success: false, message: 'Failed to create plan' };
  }
}

export async function deletePlan(id: string) {
    try {
        await prisma.plan.delete({ where: { id } });
        return { success: true };
    } catch (error) {
        return { success: false, message: 'Failed to delete plan' };
    }
}
