'use server';

import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma';
import { UserRole, UserPlan, User } from '../types';

export interface AuthState {
  success: boolean;
  message?: string;
  user?: User;
}

export async function login(prevState: AuthState | null, formData: FormData): Promise<AuthState> {
  //const email = formData.get('email') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { success: false, message: 'Login e senha são obrigatórios.' };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (user && user.password) {
      const isValidPass = await bcrypt.compare(password, user.password);
      if (isValidPass) {
        if (user.role !== UserRole.CLIENTE && !user.isActive) {
          return { success: false, message: 'Acesso negado. Sua conta de barbeiro está inativa.' };
        }
        
        const mappedUser: User = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role as UserRole,
            plan: user.plan as UserPlan,
            isActive: user.isActive,
            whatsapp: user.whatsapp || undefined,
            barbeiroId: user.barbeiroId || undefined
        };

        return { success: true, user: mappedUser };
      }
    }
  } catch (error) {
    return { success: false, message: 'Erro ao conectar no banco de dados.' };
  }

  return { success: false, message: 'Credenciais inválidas ou acesso restrito.' };
}

export async function signup(prevState: AuthState | null, formData: FormData): Promise<AuthState> {
  const name = formData.get('name') as string;
  const password = formData.get('password') as string;
  const whatsapp = formData.get('whatsapp') as string;
  const birthDate = formData.get('birthDate') as string;

  if (!name || !password || !whatsapp || !birthDate) {
    return { success: false, message: 'Todos os campos são obrigatórios.' };
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email: `${name.toLowerCase().replace(/\s/g, '')}@example.com` }, // Using this logic for email gen from original code
    });

    if (existingUser) {
        return { success: false, message: 'Usuário já existe.' };
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const email = `${name.toLowerCase().replace(/\s/g, '')}@example.com`;

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        whatsapp,
        role: UserRole.CLIENTE,
        plan: UserPlan.START,
        isActive: true,
      },
    });

    const mappedUser: User = {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role as UserRole,
        plan: newUser.plan as UserPlan,
        isActive: newUser.isActive,
        whatsapp: newUser.whatsapp || undefined,
        barbeiroId: newUser.barbeiroId || undefined
    };

    return { success: true, user: mappedUser };

  } catch (error) {
    console.error('Signup error:', error);
    return { success: false, message: 'Erro ao criar conta.' };
  }
}
