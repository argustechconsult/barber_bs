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
  const loginInput = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!loginInput || !password) {
    return { success: false, message: 'Login e senha são obrigatórios.' };
  }

  try {
    // Try to find the user by email or whatsapp
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: loginInput },
          { whatsapp: loginInput.replace(/\D/g, '') }
        ]
      }
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
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const whatsappRaw = formData.get('whatsapp') as string;
  const birthDate = formData.get('birthDate') as string;

  const whatsapp = whatsappRaw ? whatsappRaw.replace(/\D/g, '') : '';

  if (!name || !email || !password || !whatsapp || !birthDate) {
    return { success: false, message: 'Todos os campos são obrigatórios.' };
  }

  try {
    // Check if user exists by whatsapp or email
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { whatsapp },
          { email }
        ]
      },
    });

    if (existingUser) {
        return { success: false, message: 'Usuário (email ou telefone) já cadastrado.' };
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Explicitly enforce CLIENT role and START plan
    const newUser = await prisma.user.create({
      data: { 
        name,
        email,
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

export async function createBarberInvite(name: string, email: string) {
  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return { success: false, message: 'Email já cadastrado.' };
    }

    // Generate random token (simple version for now)
    const token = crypto.randomUUID();

    const user = await prisma.user.create({
      data: {
        name,
        email,
        role: UserRole.BARBEIRO,
        isActive: true,
        inviteToken: token,
      },
    });

    // In a real app, send email here. For now, return the link.
    const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite?token=${token}`;

    return { success: true, inviteLink };
  } catch (error) {
    console.error('Invite Error:', error);
    return { success: false, message: 'Erro ao criar convite.' };
  }
}

export async function getInviteDetails(token: string) {
    const user = await prisma.user.findUnique({
        where: { inviteToken: token }
    });

    if (!user) return null;

    return {
        name: user.name,
        email: user.email
    };
}

export async function acceptInvite(token: string, password: string) {
   try {
     const user = await prisma.user.findUnique({
         where: { inviteToken: token }
     });

     if (!user) return { success: false, message: 'Convite inválido.' };

     const hashedPassword = await bcrypt.hash(password, 10);

     await prisma.user.update({
         where: { id: user.id },
         data: {
             password: hashedPassword,
             inviteToken: null, // Clear token so it can't be used again
         }
     });

     return { success: true };
   } catch (error) {
       console.error("Accept Invite Error:", error);
       return { success: false, message: 'Erro ao definir senha.' };
   }
}
