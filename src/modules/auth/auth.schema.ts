import { z } from "zod";

export const ResetPasswordSchema = z.object({
  email: z.string().email("Insira um e-mail válido"),
});

export const NewPasswordSchema = z.object({
  password: z.string().min(6, "A nova senha deve ter no mínimo 6 caracteres"),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

export const RecoveryIdentitySchema = z.object({
  email: z.string().email('E-mail inválido'),
  birthDate: z.string().min(10, 'Data de nascimento inválida (DD/MM/AAAA)'),
});

export const RecoverPasswordSchema = z.object({
  email: z.string().email('E-mail inválido'),
  birthDate: z.string().min(10, 'Data de nascimento inválida (DD/MM/AAAA)'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
  confirmPassword: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});
