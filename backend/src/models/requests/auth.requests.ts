import { z } from 'zod';
import {
  emailField,
  fullNameField,
  optionalPhoneField,
  passwordField,
  timezoneField,
} from './common.requests';

export const registerCustomerSchema = z.object({
  fullName: fullNameField,
  email: emailField,
  password: passwordField,
  phone: optionalPhoneField,
});
export type RegisterCustomerRequest = z.infer<typeof registerCustomerSchema>;

export const registerBusinessSchema = z.object({
  fullName: fullNameField,
  email: emailField,
  password: passwordField,
  phone: optionalPhoneField,
  businessName: z
    .string({ error: 'Business name is required.' })
    .trim()
    .min(2, 'Business name must be at least 2 characters.')
    .max(100, 'Business name must be at most 100 characters.'),
  city: z
    .string({ error: 'City is required.' })
    .trim()
    .min(2, 'City must be at least 2 characters.')
    .max(100, 'City must be at most 100 characters.'),
  timezone: timezoneField,
  categoryIds: z
    .array(z.uuid({ error: 'Invalid category id.' }), { error: 'Choose 1 to 3 categories.' })
    .min(1, 'Choose at least 1 category.')
    .max(3, 'Choose at most 3 categories.')
    .refine((ids) => new Set(ids).size === ids.length, 'Each category can only be chosen once.'),
});
export type RegisterBusinessRequest = z.infer<typeof registerBusinessSchema>;

export const loginSchema = z.object({
  email: emailField,
  // Do not check password rules at login - just that something was typed.
  password: z.string({ error: 'Password is required.' }).min(1, 'Password is required.').max(200),
});
export type LoginRequest = z.infer<typeof loginSchema>;

export const tokenSchema = z.object({
  token: z.string({ error: 'Token is required.' }).trim().min(10, 'Invalid token.').max(200, 'Invalid token.'),
});
export type TokenRequest = z.infer<typeof tokenSchema>;

export const forgotPasswordSchema = z.object({
  email: emailField,
});
export type ForgotPasswordRequest = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: tokenSchema.shape.token,
  newPassword: passwordField,
});
export type ResetPasswordRequest = z.infer<typeof resetPasswordSchema>;
