import 'dotenv/config';
import { prisma } from '../lib/prisma';

async function main() {
  console.log('Testing Service Model Access...');
  try {
    const services = await prisma.service.findMany();
    console.log('Services found:', services);
  } catch (error) {
    console.error('Error accessing Service model:', error);
  } finally {
    process.exit();
  }
}

main();
