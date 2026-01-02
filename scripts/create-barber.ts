import 'dotenv/config';
import { prisma } from '../lib/prisma';
import { UserRole } from '../lib/generated/client'; // Assuming enum is exported here or from db
import bcrypt from 'bcrypt';

async function main() {
  console.log('Creating Barber...');
  
  const hashedPassword = await bcrypt.hash('123456', 10);
  
  try {
     const barber = await prisma.user.create({
        data: {
            name: 'João Barbeiro',
            email: 'joao@barber.com',
            whatsapp: '11999990000',
            password: hashedPassword,
            role: 'BARBEIRO', // Enum string
            isActive: true
        }
     });
     console.log('Barber created:', barber);
  } catch (e) {
      console.error('Error creating barber:', e);
  }
}

main();
