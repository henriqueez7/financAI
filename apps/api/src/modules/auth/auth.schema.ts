import { z } from "zod";

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "O nome deve possuir pelo menos 2 caracteres.")
    .max(100, "O nome deve possuir no máximo 100 caracteres."),

  email: z
    .string()
    .trim()
    .email("Informe um e-mail válido.")
    .transform((email) => email.toLowerCase()),

  password: z
    .string()
    .min(8, "A senha deve possuir pelo menos 8 caracteres.")
    .max(72, "A senha deve possuir no máximo 72 caracteres."),
}).strict();

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Informe um e-mail válido.")
    .transform((email) => email.toLowerCase()),

  password: z
    .string()
    .min(1, "Informe sua senha.")
    .max(72, "A senha deve possuir no máximo 72 caracteres."),
}).strict();

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
