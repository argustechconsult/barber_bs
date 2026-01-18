import 'dotenv/config';
import { prisma } from '../lib/prisma';

const DEFAULT_CATEGORIES = [
  'Cabelo',
  'Barba',
  'Acessórios',
  'Pós-Barba',
];

async function main() {
  console.log('--- SEEDING MARKETPLACE CATEGORIES ---\n');

  for (const name of DEFAULT_CATEGORIES) {
    const exists = await prisma.productCategory.findFirst({
      where: { name }
    });

    if (!exists) {
      await prisma.productCategory.create({
        data: { name }
      });
      console.log(`✅ Created category: ${name}`);
    } else {
      console.log(`ℹ️ Category already exists: ${name}`);
    }
  }

  console.log('\nSeed completed!');
  process.exit();
}

main();
