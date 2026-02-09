'use server';

import { prisma } from '../../../lib/prisma';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';

const EMAILJS_REST_API = 'https://api.emailjs.com/api/v1.0/email/send';

export async function sendResetLink(emailRaw: string) {
  try {
    const email = emailRaw.toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      console.log(`[Auth] Password reset requested for non-existent email: ${email}`);
      return { success: true }; // Security: don't reveal if email exists
    }

    const resetToken = uuidv4();
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour validity

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    });

    const resetLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/reset-password?token=${resetToken}`;

    // Integration with EmailJS via REST API (Secure: key stays on server)
    const payload = {
      service_id: process.env.EMAILJS_SERVICE_ID,
      template_id: process.env.EMAILJS_TEMPLATE_ID,
      user_id: process.env.EMAILJS_PUBLIC_KEY,
      template_params: {
        to_name: user.name,
        to_email: email,
        reset_link: resetLink,
        message: "Você solicitou a redefinição de senha para sua conta no Barbearia Stayler."
      },
    };

    const response = await fetch(EMAILJS_REST_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('EmailJS Error:', errorText);
      throw new Error('Falha ao enviar e-mail de recuperação.');
    }

    return { success: true };
  } catch (error) {
    console.error('sendResetLink error:', error);
    return { success: false, message: 'Erro ao processar solicitação.' };
  }
}

export async function resetPasswordByToken(token: string, password: string) {
  try {
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      return { success: false, message: 'Token de recuperação inválido ou expirado.' };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    return { success: true };
  } catch (error) {
    console.error('resetPassword error:', error);
    return { success: false, message: 'Erro ao redefinir senha. Tente novamente.' };
  }
}

export async function validateUserIdentity(emailRaw: string, birthDate: string) {
  try {
    const email = emailRaw.toLowerCase();
    const user = await prisma.user.findFirst({
      where: {
        email,
        birthDate
      }
    });

    if (!user) {
      return { success: false, message: 'Dados não conferem. Verifique o e-mail e a data de nascimento.' };
    }

    return { success: true };
  } catch (error) {
    console.error('validateUserIdentity error:', error);
    return { success: false, message: 'Erro ao validar identidade.' };
  }
}

export async function updateUserPassword(emailRaw: string, birthDate: string, password: string) {
  try {
    const email = emailRaw.toLowerCase();
    const user = await prisma.user.findFirst({
      where: {
        email,
        birthDate
      }
    });

    if (!user) {
      return { success: false, message: 'Dados não conferem. Operação negada.' };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    return { success: true };
  } catch (error) {
    console.error('updateUserPassword error:', error);
    return { success: false, message: 'Erro ao atualizar senha.' };
  }
}
