'use server';

import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma';
import { UserRole, UserPlan, User } from '../types';
import { createSession, deleteSession, verifySession } from '../lib/session';

export interface AuthState {
  success: boolean;
  message?: string;
  user?: User;
}

export async function login(prevState: AuthState | null, formData: FormData): Promise<AuthState> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { success: false, message: 'Login e senha são obrigatórios.' };
  }

  try {
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email },
          { whatsapp: email } // Allow login with whatsapp using the 'email' field input
        ]
      },
    });

    if (user && user.password) {
      const isValidPass = await bcrypt.compare(password, user.password);
      if (isValidPass) {
        if (user.role !== UserRole.CLIENTE && !user.isActive) {
          return { success: false, message: 'Acesso negado. Sua conta de barbeiro está inativa.' };
        }
        
        await createSession(user.id);

        const mappedUser: User = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role as UserRole,
            plan: user.plan as UserPlan,
            isActive: user.isActive,
            whatsapp: user.whatsapp || undefined,
            barbeiroId: user.barbeiroId || undefined,
            birthDate: user.birthDate || undefined
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
    // Check if user exists by whatsapp
    const existingUser = await prisma.user.findUnique({
      where: { whatsapp },
    });

    if (existingUser) {
        return { success: false, message: 'Usuário (telefone) já cadastrado.' };
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Explicitly enforce CLIENT role and START plan
    const newUser = await prisma.user.create({
      data: { 
        name,
        // email is optional now
        password: hashedPassword,
        whatsapp,
        birthDate,
        role: UserRole.CLIENTE,
        plan: UserPlan.START,
        isActive: true,
      },
    });

    await createSession(newUser.id);

    // Return User object strict for Client view
    const mappedUser: User = {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email || '', // Handle null email
        role: UserRole.CLIENTE,
        plan: UserPlan.START,
        isActive: true,
        whatsapp: newUser.whatsapp || undefined,
        birthDate: newUser.birthDate || undefined
        // barbeiroId omitted
    };

    return { success: true, user: mappedUser };

  } catch (error) {
    console.error('Signup error:', error);
    return { success: false, message: 'Erro ao criar conta.' };
  }
}

export async function logout() {
  await deleteSession();
}

export async function checkSession() {
  const session = await verifySession();
  if (session.isAuth && session.userId) {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    });
    
    if (user) {
         const mappedUser: User = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role as UserRole,
            plan: user.plan as UserPlan,
            isActive: user.isActive,
            whatsapp: user.whatsapp || undefined,
            barbeiroId: user.barbeiroId || undefined,
            birthDate: user.birthDate || undefined
        };
        return { isAuth: true, user: mappedUser };
    }
  }
  return { isAuth: false, user: null };
}
