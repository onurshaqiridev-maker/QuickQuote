import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router';
import { useAuth } from '../../hooks/useAuth';
import { homePathForRole } from '../../utils/roles';
import { Button, ButtonLink } from '../ui/Button';
import { Logo } from '../ui/Logo';

const PUBLIC_LINKS = [
  { to: '/explore', label: 'Explore' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
];

const DASHBOARD_LABEL = { customer: 'My account', business_owner: 'Dashboard', admin: 'Admin' } as const;

function linkClass({ isActive }: { isActive: boolean }) {
  return `rounded-md px-3 py-2 text-sm font-medium ${isActive ? 'text-brand-700' : 'text-slate-600 hover:text-slate-900'}`;
}

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    setMenuOpen(false);
    navigate('/');
  };

  const accountActions = user ? (
    <>
      <ButtonLink to={homePathForRole(user.role)} variant="secondary">
        {DASHBOARD_LABEL[user.role]}
      </ButtonLink>
      <Button variant="ghost" onClick={handleLogout}>
        Log out
      </Button>
    </>
  ) : (
    <>
      <ButtonLink to="/login" variant="ghost">
        Log in
      </ButtonLink>
      <ButtonLink to="/register">Sign up</ButtonLink>
    </>
  );

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8" aria-label="Main">
        <Logo />
        <div className="hidden items-center gap-1 md:flex">
          {PUBLIC_LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} className={linkClass}>
              {link.label}
            </NavLink>
          ))}
        </div>
        <div className="hidden items-center gap-2 md:flex">{accountActions}</div>
        <button
          type="button"
          className="rounded-md p-2 text-slate-700 hover:bg-slate-100 md:hidden"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
            {menuOpen ? <path d="M6 6l12 12M6 18L18 6" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </nav>
      {menuOpen && (
        <div className="border-t border-slate-200 px-4 py-3 md:hidden">
          <div className="flex flex-col">
            {PUBLIC_LINKS.map((link) => (
              <NavLink key={link.to} to={link.to} className={linkClass} onClick={() => setMenuOpen(false)}>
                {link.label}
              </NavLink>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2" onClick={() => setMenuOpen(false)}>
            {accountActions}
          </div>
        </div>
      )}
    </header>
  );
}
