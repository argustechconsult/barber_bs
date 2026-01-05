import 'dotenv/config';
import { prisma } from './lib/prisma';

async function main() {
  console.log('Checking Plans...');
  const plans = await prisma.plan.findMany();
  console.log('Found plans:', JSON.stringify(plans, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
