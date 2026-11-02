import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { describe, expect, it } from 'vitest';
import { AuthContext } from '../../context/auth-context';
import { fakeAuth } from '../../test/fake-auth';
import type { UserRole } from '../../types/api';
import { CustomerOnly } from './CustomerOnly';

function LoginPage() {
  const location = useLocation();
  return <p>Login page, back to {(location.state as { from: string }).from}</p>;
}

function renderGate(role: UserRole | null, emailVerified = true) {
  render(
    <AuthContext.Provider value={fakeAuth(role, { emailVerified })}>
      <MemoryRouter initialEntries={['/businesses/bella']}>
        <Routes>
          <Route path="/businesses/bella" element={<CustomerOnly action="request a quote" returnQuery="?quote=general"><p>The form</p></CustomerOnly>} />
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe('CustomerOnly', () => {
  it('shows the content to a customer with a confirmed email', () => {
    renderGate('customer');
    expect(screen.getByText('The form')).toBeInTheDocument();
  });

  it('asks visitors to log in, and remembers where to come back to', () => {
    renderGate(null);
    expect(screen.queryByText('The form')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Log in to request a quote' }));
    expect(screen.getByText('Login page, back to /businesses/bella?quote=general')).toBeInTheDocument();
  });

  it('explains that business accounts cannot do this', () => {
    renderGate('business_owner');
    expect(screen.getByText(/Only customer accounts can request a quote/)).toBeInTheDocument();
  });

  it('asks for a confirmed email first', () => {
    renderGate('customer', false);
    expect(screen.getByText('Please confirm your email address')).toBeInTheDocument();
    expect(screen.queryByText('The form')).not.toBeInTheDocument();
  });
});
