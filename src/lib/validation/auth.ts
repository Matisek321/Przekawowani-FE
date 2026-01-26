import { z } from 'zod'

export const LoginBodySchema = z.object({
  email: z.string().email('Podaj prawidłowy adres email'),
  password: z.string().min(1, 'Hasło jest wymagane'),
})

export type LoginBody = z.infer<typeof LoginBodySchema>

export const RegisterBodySchema = z.object({
  email: z.string().email('Podaj prawidłowy adres email'),
  password: z
    .string()
    .min(8, 'Hasło musi mieć minimum 8 znaków')
    .max(72, 'Hasło może mieć maksymalnie 72 znaki'),
})

export const ForgotPasswordBodySchema = z.object({
  email: z.string().email('Podaj prawidłowy adres email'),
})

export const ResetPasswordBodySchema = z.object({
  password: z
    .string()
    .min(8, 'Hasło musi mieć minimum 8 znaków')
    .max(72, 'Hasło może mieć maksymalnie 72 znaki'),
})

export type RegisterBody = z.infer<typeof RegisterBodySchema>
export type ForgotPasswordBody = z.infer<typeof ForgotPasswordBodySchema>
export type ResetPasswordBody = z.infer<typeof ResetPasswordBodySchema>
