import 'dotenv/config';
import { prisma } from '../lib/prisma';

async function main() {
  console.log('Testing DB connection...');
  try {
    const users = await prisma.user.findMany();
    console.log('Connection successful!');
    console.log('Users found:', users.length);
    users.forEach(u => {
      console.log(`User: ${u.name} | Email: ${u.email} | Whatsapp: ${u.whatsapp} | Role: ${u.role} | Plan: ${u.plan}`);
    });
  } catch (error) {
    console.error('Connection failed:', error);
  } finally {
    process.exit();
  }
}

main();
