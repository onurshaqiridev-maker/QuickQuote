/** Account settings that every logged-in user has: name, phone, password. */
import * as userRepository from '../data/repositories/user.repository';
import { UnauthenticatedError, ValidationError } from '../models/errors';
import type { ChangePasswordRequest, UpdateProfileRequest } from '../models/requests/account.requests';
import type { UserResponse } from '../models/responses/user.response';
import { hashPassword, verifyPassword } from './password.service';
import { toUserResponse } from './mappers';

export async function updateProfile(userId: string, input: UpdateProfileRequest): Promise<UserResponse> {
  const user = await userRepository.updateProfile(userId, { fullName: input.fullName, phone: input.phone ?? null });
  if (!user) throw new UnauthenticatedError();
  return toUserResponse(user);
}

export async function changePassword(userId: string, input: ChangePasswordRequest): Promise<void> {
  const user = await userRepository.findById(userId);
  if (!user) throw new UnauthenticatedError();
  if (!(await verifyPassword(input.currentPassword, user.passwordHash))) {
    throw new ValidationError([{ field: 'currentPassword', message: 'Current password is incorrect.' }]);
  }
  await userRepository.updatePasswordHash(user.id, await hashPassword(input.newPassword));
}
