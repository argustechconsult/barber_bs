'use server';

import { prisma } from '../../lib/prisma';

export async function createProduct(data: {
  name: string;
  description: string;
  price: number;
  category: string;
  stock: number;
  image?: string; // Optional Base64 image
}) {
  console.log('--- createProduct START ---');
  // ... logging ...

  try {
    // 1. Create in DB
    const product = await prisma.product.create({
      data: {
        name: data.name,
        price: data.price,
        category: data.category,
        stock: data.stock,
        description: data.description, 
        image: data.image,
      },
    });

    console.log('--- createProduct SUCCESS ---', product.id);
    return { success: true, product };
  } catch (error: any) {
    console.error('--- createProduct ERROR ---', error);
    return { success: false, message: 'Failed to create product: ' + error.message };
  }
}

export async function getProducts() {
  try {
    const products = await prisma.product.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
    return { success: true, products };
  } catch (error) {
    console.error('Get Products Error:', error);
    return { success: false, products: [], message: 'Failed to fetch products' };
  }
}

export async function deleteProduct(id: string) {
  try {
    // 1. Delete from DB
    await prisma.product.delete({
      where: { id },
    });
    return { success: true };
  } catch (error) {
    console.error('Delete Product Error:', error);
    return { success: false, message: 'Failed to delete product' };
  }
}

export async function updateProduct(
  id: string,
  data: {
    name: string;
    description: string;
    price: number;
    category: string;
    stock: number;
    image?: string;
  }
) {
  console.log('--- updateProduct START ---');
  // ... logging ...

  try {
    // 1. Update DB
    const product = await prisma.product.update({
      where: { id },
      data: {
        name: data.name,
        price: data.price,
        category: data.category,
        stock: data.stock,
        description: data.description,
        image: data.image,
      },
    });

    console.log('--- updateProduct SUCCESS ---', product.id);
    return { success: true, product };
  } catch (error: any) {
    console.error('--- updateProduct ERROR ---', error);
    return { success: false, message: 'Failed to update product: ' + error.message };
  }
}

export async function getCategories() {
  try {
    const categories = await prisma.productCategory.findMany({
      orderBy: { name: 'asc' },
    });
    return { success: true, categories };
  } catch (error) {
    console.error('Get Categories Error:', error);
    return { success: false, categories: [], message: 'Failed to fetch categories' };
  }
}

export async function createCategory(name: string) {
  try {
    const category = await prisma.productCategory.create({
      data: { name },
    });
    return { success: true, category };
  } catch (error: any) {
    console.error('Create Category Error:', error);
    return { success: false, message: 'Failed to create category: ' + error.message };
  }
}

export async function deleteCategory(id: string) {
  try {
    await prisma.productCategory.delete({
      where: { id },
    });
    return { success: true };
  } catch (error) {
    console.error('Delete Category Error:', error);
    return { success: false, message: 'Failed to delete category' };
  }
}

export async function getTransaction(id: string) {
  try {
    const transaction = await prisma.transaction.findUnique({
      where: { id },
    });
    return { success: true, transaction };
  } catch (error) {
    console.error('Get Transaction Error:', error);
    return { success: false, message: 'Failed to fetch transaction' };
  }
}
