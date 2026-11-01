import { createContext } from 'react';
import type { RegisterBusinessInput, RegisterCustomerInput } from '../api/auth.api';
import type { AuthData, BusinessSummary, User } from '../types/api';

export interface AuthContextValue {
  /** The logged-in user, or null when nobody is logged in. */
  user: User | null;
  /** The owner's business (business owners only). */
  business: BusinessSummary | null;
  /** True while we ask the backend "who is logged in?" on page load. */
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthData>;
  registerCustomer: (input: RegisterCustomerInput) => Promise<AuthData>;
  registerBusiness: (input: RegisterBusinessInput) => Promise<AuthData>;
  logout: () => Promise<void>;
  /** Reload the user from the backend (e.g. after confirming the email). */
  refresh: () => Promise<void>;
  /** Replace the user after a profile update. */
  setUser: (user: User) => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
