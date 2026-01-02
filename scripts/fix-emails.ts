import 'dotenv/config';
import { prisma } from '../lib/prisma';

async function main() {
  console.log('Starting data migration...');

  const updates = [
    { oldEmail: 'admin', newEmail: 'admin@barber.com' },
    { oldEmail: 'start', newEmail: 'start@barber.com' },
    { oldEmail: 'premium', newEmail: 'premium@barber.com' },
  ];

  for (const update of updates) {
    try {
      const user = await prisma.user.findFirst({
        where: { email: update.oldEmail } // Find by current "invalid" email
      });

      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: { email: update.newEmail }
        });
        console.log(`Updated user ${user.name}: ${update.oldEmail} -> ${update.newEmail}`);
      } else {
        console.log(`User with email '${update.oldEmail}' not found.`);
      }
    } catch (e) {
      console.error(`Failed to update ${update.oldEmail}:`, e);
    }
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    // await prisma.$disconnect();
    process.exit(0);
  });
