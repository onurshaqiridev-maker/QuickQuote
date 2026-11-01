/**
 * Keeps track of who is logged in, for the whole app.
 *
 * The login itself is an httpOnly cookie that JavaScript cannot read (that is the point:
 * scripts cannot steal it). So on page load we ask the backend: GET /api/auth/me.
 */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { authApi, type RegisterBusinessInput, type RegisterCustomerInput } from '../api/auth.api';
import type { AuthData, BusinessSummary, User } from '../types/api';
import { AuthContext, type AuthContextValue } from './auth-context';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [business, setBusiness] = useState<BusinessSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const applyAuth = useCallback((data: AuthData | null) => {
    setUserState(data?.user ?? null);
    setBusiness(data?.business ?? null);
  }, []);

  const refresh = useCallback(async () => {
    try {
      applyAuth(await authApi.me());
    } catch {
      applyAuth(null); // 401 = not logged in
    }
  }, [applyAuth]);

  // On page load: ask the backend who is logged in (state is only set once the answer arrives).
  useEffect(() => {
    authApi
      .me()
      .then((data) => applyAuth(data))
      .catch(() => applyAuth(null))
      .finally(() => setLoading(false));
  }, [applyAuth]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      business,
      loading,
      refresh,
      setUser: setUserState,
      login: async (email, password) => {
        const data = await authApi.login(email, password);
        applyAuth(data);
        return data;
      },
      registerCustomer: async (input: RegisterCustomerInput) => {
        const data = await authApi.registerCustomer(input);
        applyAuth(data);
        return data;
      },
      registerBusiness: async (input: RegisterBusinessInput) => {
        const data = await authApi.registerBusiness(input);
        applyAuth(data);
        return data;
      },
      logout: async () => {
        await authApi.logout().catch(() => undefined);
        applyAuth(null);
      },
    }),
    [user, business, loading, refresh, applyAuth],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
