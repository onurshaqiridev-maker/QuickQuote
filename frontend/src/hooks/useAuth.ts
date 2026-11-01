import { useContext } from 'react';
import { AuthContext, type AuthContextValue } from '../context/auth-context';

/** Who is logged in, plus login/logout/register functions. */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
