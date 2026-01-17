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
