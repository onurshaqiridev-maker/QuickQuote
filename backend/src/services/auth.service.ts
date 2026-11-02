/**
 * Authentication: registration, login, sessions, email confirmation and password reset.
 *
 * Emails are never sent here directly: they are put in the email queue, inside the same
 * transaction as the change that caused them.
 */
import { createHash, randomBytes } from 'node:crypto';
import { env } from '../config/env';
import { withTransaction, type Transaction } from '../data/db';
import * as authTokenRepository from '../data/repositories/auth-token.repository';
import * as businessRepository from '../data/repositories/business.repository';
import * as categoryRepository from '../data/repositories/category.repository';
import * as userRepository from '../data/repositories/user.repository';
import type { AuthenticatedUser, AuthResult } from '../models/dto/user.dto';
import type { AuthTokenPurpose } from '../models/enums';
import { DomainError, UnauthenticatedError, ValidationError } from '../models/errors';
import type {
  LoginRequest,
  RegisterBusinessRequest,
  RegisterCustomerRequest,
} from '../models/requests/auth.requests';
import type { AuthResponse, BusinessSummaryResponse, UserResponse } from '../models/responses/user.response';
import { logActivity } from './activity.service';
import { enqueueEmail } from './email/email-queue.service';
import { toBusinessSummaryResponse, toUserResponse } from './mappers';
import { hashPassword, verifyPassword } from './password.service';
import { readSessionToken, signSessionToken, startedBeforePasswordChange } from './session.service';

const EMAIL_VERIFICATION_HOURS = 48;
const PASSWORD_RESET_HOURS = 1;

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

/** One-time tokens are stored only as a SHA-256 hash; the real token only exists in the email link. */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

async function createOneTimeToken(
  userId: string,
  purpose: AuthTokenPurpose,
  validForHours: number,
  tx: Transaction,
): Promise<string> {
  const token = randomBytes(32).toString('hex');
  await authTokenRepository.insert(
    { userId, purpose, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + validForHours * 3_600_000) },
    tx,
  );
  return token;
}

function frontendLink(pathAndQuery: string): string {
  return new URL(pathAndQuery, env.FRONTEND_URL).toString();
}

/** Turns "Bella Hair Studio!" into "bella-hair-studio". */
export function slugify(text: string): string {
  const slug = text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // remove accents: "é" -> "e"
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
  return slug || 'business';
}

/** "bella-hair-studio", or "bella-hair-studio-2" if that is taken, and so on. */
async function pickFreeSlug(name: string, tx: Transaction): Promise<string> {
  const base = slugify(name);
  const taken = new Set(await businessRepository.findSlugsLike(base, tx));
  if (!taken.has(base)) return base;
  let counter = 2;
  while (taken.has(`${base}-${counter}`)) counter += 1;
  return `${base}-${counter}`;
}

async function ensureEmailAvailable(email: string): Promise<void> {
  if (await userRepository.findByEmail(email)) {
    throw new DomainError('EMAIL_TAKEN', 'An account with this email already exists. Log in or reset your password.');
  }
}

async function findBusinessSummary(ownerUserId: string): Promise<BusinessSummaryResponse | undefined> {
  const business = await businessRepository.findByOwnerUserId(ownerUserId);
  if (!business) return undefined;
  const profile = await businessRepository.findProfileByBusinessId(business.id);
  return profile ? toBusinessSummaryResponse(business, profile) : undefined;
}

// A real bcrypt hash, compared against when the email does not exist, so a login attempt takes
// the same time whether or not the account exists (attackers cannot discover registered emails).
let dummyHash: string | undefined;
async function getDummyHash(): Promise<string> {
  dummyHash ??= await hashPassword(randomBytes(16).toString('hex'));
  return dummyHash;
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export async function registerCustomer(input: RegisterCustomerRequest): Promise<AuthResult> {
  await ensureEmailAvailable(input.email);
  const passwordHash = await hashPassword(input.password);

  return withTransaction(async (tx) => {
    const user = await userRepository.insert(
      { email: input.email, passwordHash, fullName: input.fullName, phone: input.phone ?? null, role: 'customer' },
      tx,
    );
    const verifyToken = await createOneTimeToken(user.id, 'email_verification', EMAIL_VERIFICATION_HOURS, tx);
    await enqueueEmail(
      {
        to: user.email,
        template: 'customer_welcome',
        payload: { fullName: user.fullName, verifyUrl: frontendLink(`/verify-email?token=${verifyToken}`) },
      },
      tx,
    );
    await logActivity(
      { actorUserId: user.id, action: 'user.registered', entityType: 'user', entityId: user.id, metadata: { role: user.role } },
      tx,
    );
    return { user: toUserResponse(user), sessionToken: signSessionToken(user) };
  });
}

export async function registerBusiness(input: RegisterBusinessRequest): Promise<AuthResult> {
  await ensureEmailAvailable(input.email);
  const activeCategories = await categoryRepository.countActiveByIds(input.categoryIds);
  if (activeCategories !== input.categoryIds.length) {
    throw new ValidationError([{ field: 'categoryIds', message: 'One or more categories do not exist.' }]);
  }
  const passwordHash = await hashPassword(input.password);

  return withTransaction(async (tx) => {
    // 1. The owner's account
    const user = await userRepository.insert(
      { email: input.email, passwordHash, fullName: input.fullName, phone: input.phone ?? null, role: 'business_owner' },
      tx,
    );
    // 2. The business (waits for admin review) and its unpublished public profile
    const business = await businessRepository.insert({ ownerUserId: user.id, timezone: input.timezone }, tx);
    const profile = await businessRepository.insertProfile(
      { businessId: business.id, slug: await pickFreeSlug(input.businessName, tx), displayName: input.businessName, city: input.city },
      tx,
    );
    await businessRepository.addCategoryLinks(business.id, input.categoryIds, tx);

    // 3. Emails: welcome to the owner, "new business to review" to the admin
    const verifyToken = await createOneTimeToken(user.id, 'email_verification', EMAIL_VERIFICATION_HOURS, tx);
    await enqueueEmail(
      {
        to: user.email,
        template: 'business_welcome',
        payload: {
          fullName: user.fullName,
          businessName: profile.displayName,
          verifyUrl: frontendLink(`/verify-email?token=${verifyToken}`),
          dashboardUrl: frontendLink('/dashboard'),
        },
      },
      tx,
    );
    await enqueueEmail(
      {
        to: env.ADMIN_NOTIFICATION_EMAIL,
        template: 'admin_new_business',
        payload: { businessName: profile.displayName, ownerName: user.fullName, ownerEmail: user.email, city: input.city },
      },
      tx,
    );

    await logActivity(
      { actorUserId: user.id, action: 'business.registered', entityType: 'business', entityId: business.id },
      tx,
    );
    return {
      user: toUserResponse(user),
      business: toBusinessSummaryResponse(business, profile),
      sessionToken: signSessionToken(user),
    };
  });
}

// ---------------------------------------------------------------------------
// Login and sessions
// ---------------------------------------------------------------------------

export async function login(input: LoginRequest): Promise<AuthResult> {
  const user = await userRepository.findByEmail(input.email);
  const passwordMatches = await verifyPassword(input.password, user?.passwordHash ?? (await getDummyHash()));
  if (!user || !passwordMatches) {
    // Same message for "unknown email" and "wrong password".
    throw new DomainError('INVALID_CREDENTIALS', 'Email or password is incorrect.');
  }
  if (user.status !== 'active') {
    throw new DomainError('ACCOUNT_SUSPENDED', 'This account has been suspended. Please contact support.');
  }
  await userRepository.updateLastLogin(user.id);
  return {
    user: toUserResponse(user),
    business: user.role === 'business_owner' ? await findBusinessSummary(user.id) : undefined,
    sessionToken: signSessionToken(user),
  };
}

/**
 * Checks a session token (from the cookie) and loads the user.
 * The user is loaded from the database on every request, so a suspended user is blocked immediately.
 */
export async function authenticateSession(token: string): Promise<AuthenticatedUser> {
  const session = readSessionToken(token);
  if (!session) throw new UnauthenticatedError('Your session has expired. Please log in again.');

  const user = await userRepository.findById(session.userId);
  if (!user) throw new UnauthenticatedError('Your session has expired. Please log in again.');
  if (startedBeforePasswordChange(session.issuedAt, user.passwordChangedAt)) {
    throw new UnauthenticatedError('Your password was changed. Please log in again.');
  }
  if (user.status !== 'active') {
    throw new DomainError('ACCOUNT_SUSPENDED', 'This account has been suspended. Please contact support.');
  }
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    status: user.status,
    emailVerified: user.emailVerifiedAt !== null,
  };
}

export async function getCurrentUser(userId: string): Promise<AuthResponse> {
  const user = await userRepository.findById(userId);
  if (!user) throw new UnauthenticatedError();
  return {
    user: toUserResponse(user),
    business: user.role === 'business_owner' ? await findBusinessSummary(user.id) : undefined,
  };
}

// ---------------------------------------------------------------------------
// Email confirmation
// ---------------------------------------------------------------------------

export async function verifyEmail(token: string): Promise<UserResponse> {
  return withTransaction(async (tx) => {
    const usedToken = await authTokenRepository.consume(hashToken(token), 'email_verification', tx);
    if (!usedToken) {
      throw new DomainError('INVALID_TOKEN', 'This confirmation link is invalid or has expired. Please request a new one.');
    }
    const user = await userRepository.markEmailVerified(usedToken.userId, tx);
    if (!user) throw new DomainError('INVALID_TOKEN', 'This confirmation link is invalid.');
    await logActivity({ actorUserId: user.id, action: 'user.email_verified', entityType: 'user', entityId: user.id }, tx);
    return toUserResponse(user);
  });
}

export async function resendVerificationEmail(userId: string): Promise<void> {
  const user = await userRepository.findById(userId);
  if (!user) throw new UnauthenticatedError();
  if (user.emailVerifiedAt) {
    throw new DomainError('EMAIL_ALREADY_VERIFIED', 'Your email address is already confirmed.');
  }
  await withTransaction(async (tx) => {
    // Old links stop working; only the newest one is valid.
    await authTokenRepository.invalidateUnused(user.id, 'email_verification', tx);
    const token = await createOneTimeToken(user.id, 'email_verification', EMAIL_VERIFICATION_HOURS, tx);
    await enqueueEmail(
      {
        to: user.email,
        template: 'verify_email',
        payload: { fullName: user.fullName, verifyUrl: frontendLink(`/verify-email?token=${token}`) },
      },
      tx,
    );
  });
}

// ---------------------------------------------------------------------------
// Forgot / reset password
// ---------------------------------------------------------------------------

/** Always "succeeds", so nobody can find out which emails are registered. */
export async function requestPasswordReset(email: string): Promise<void> {
  const user = await userRepository.findByEmail(email);
  if (!user || user.status !== 'active') return;

  await withTransaction(async (tx) => {
    await authTokenRepository.invalidateUnused(user.id, 'password_reset', tx);
    const token = await createOneTimeToken(user.id, 'password_reset', PASSWORD_RESET_HOURS, tx);
    await enqueueEmail(
      {
        to: user.email,
        template: 'password_reset',
        payload: { fullName: user.fullName, resetUrl: frontendLink(`/reset-password?token=${token}`) },
      },
      tx,
    );
  });
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const passwordHash = await hashPassword(newPassword);
  await withTransaction(async (tx) => {
    const usedToken = await authTokenRepository.consume(hashToken(token), 'password_reset', tx);
    if (!usedToken) {
      throw new DomainError('INVALID_TOKEN', 'This reset link is invalid or has expired. Please request a new one.');
    }
    await userRepository.updatePasswordHash(usedToken.userId, passwordHash, new Date(), tx);
    await authTokenRepository.invalidateUnused(usedToken.userId, 'password_reset', tx);
    await logActivity(
      { actorUserId: usedToken.userId, action: 'user.password_reset', entityType: 'user', entityId: usedToken.userId },
      tx,
    );
  });
}
