import { NavLink, Outlet } from 'react-router';
import { useAuth } from '../../hooks/useAuth';
import { ROLE_LABELS } from '../../utils/roles';
import { EmailVerificationBanner } from './EmailVerificationBanner';
import { Navbar } from './Navbar';

export interface DashboardNavItem {
  to: string;
  label: string;
  /** true for the overview link, so it is only "active" on exactly that URL */
  end?: boolean;
}

/** Layout for the customer, business and admin dashboards: side menu + content. */
export function DashboardLayout({ title, items }: { title: string; items: DashboardNavItem[] }) {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row lg:px-8 lg:py-10">
        <aside className="lg:w-60 lg:shrink-0">
          <div className="mb-3 hidden lg:block">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
            {user && <p className="mt-1 truncate text-sm text-slate-700">{user.fullName} · {ROLE_LABELS[user.role]}</p>}
          </div>
          <nav aria-label={title} className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium ${
                    isActive ? 'bg-white text-brand-700 shadow-sm ring-1 ring-slate-200' : 'text-slate-600 hover:bg-white hover:text-slate-900'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <main className="min-w-0 flex-1 space-y-6">
          <EmailVerificationBanner />
          <Outlet />
        </main>
      </div>
    </div>
  );
}
