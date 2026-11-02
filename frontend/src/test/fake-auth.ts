/** A pretend login state for component tests: no API calls, just the user you choose. */
import { vi } from 'vitest';
import type { AuthContextValue } from '../context/auth-context';
import type { User, UserRole } from '../types/api';

export function fakeAuth(role: UserRole | null, overrides: Partial<User> = {}): AuthContextValue {
  const user: User | null = role
    ? { id: '1', email: 'sara@example.com', fullName: 'Sara Miller', phone: null, role, status: 'active', emailVerified: true, createdAt: '', ...overrides }
    : null;
  return {
    user,
    business: null,
    loading: false,
    login: vi.fn(),
    registerCustomer: vi.fn(),
    registerBusiness: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn(),
    setUser: vi.fn(),
  };
}
