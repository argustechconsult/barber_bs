
import { Prisma } from './lib/generated/client/client';

// This should compile if the type definitions are correct
const testWhatsapp: Prisma.UserWhereUniqueInput = { whatsapp: '123' };
const testEmail: Prisma.UserWhereUniqueInput = { email: 'test@test.com' };
const testId: Prisma.UserWhereUniqueInput = { id: '123' };

console.log('Types are correct');
