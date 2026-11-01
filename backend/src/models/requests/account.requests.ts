import { z } from 'zod';
import { fullNameField, optionalPhoneField, passwordField } from './common.requests';

export const updateProfileSchema = z.object({
  fullName: fullNameField,
  phone: optionalPhoneField,
});
export type UpdateProfileRequest = z.infer<typeof updateProfileSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string({ error: 'Current password is required.' }).min(1, 'Current password is required.'),
  newPassword: passwordField,
});
export type ChangePasswordRequest = z.infer<typeof changePasswordSchema>;
