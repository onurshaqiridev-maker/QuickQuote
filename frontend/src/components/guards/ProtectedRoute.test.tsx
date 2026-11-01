import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { AuthContext, type AuthContextValue } from '../../context/auth-context';
import type { User, UserRole } from '../../types/api';
import { ProtectedRoute } from './ProtectedRoute';

function authWith(role: UserRole | null): AuthContextValue {
  const user: User | null = role
    ? { id: '1', email: 'a@b.c', fullName: 'Test User', phone: null, role, status: 'active', emailVerified: true, createdAt: '' }
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

function renderAt(path: string, role: UserRole | null) {
  render(
    <AuthContext.Provider value={authWith(role)}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/admin" element={<ProtectedRoute roles={['admin']}><p>Admin area</p></ProtectedRoute>} />
          <Route path="/login" element={<p>Login page</p>} />
          <Route path="/account" element={<p>Customer account</p>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe('ProtectedRoute', () => {
  it('shows the page to the right role', () => {
    renderAt('/admin', 'admin');
    expect(screen.getByText('Admin area')).toBeInTheDocument();
  });

  it('sends visitors who are not logged in to the login page', () => {
    renderAt('/admin', null);
    expect(screen.getByText('Login page')).toBeInTheDocument();
  });

  it('sends users with another role to their own home page', () => {
    renderAt('/admin', 'customer');
    expect(screen.getByText('Customer account')).toBeInTheDocument();
  });
});
