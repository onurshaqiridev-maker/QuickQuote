import { Link } from 'react-router';
import { Logo } from '../ui/Logo';

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-4 lg:px-8">
        <div className="md:col-span-2">
          <Logo />
          <p className="mt-3 max-w-sm text-sm text-slate-600">
            Find trusted local businesses, compare services and prices, request quotes and book appointments.
          </p>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-900">For customers</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li><Link to="/explore" className="hover:text-slate-900">Explore businesses</Link></li>
            <li><Link to="/register" className="hover:text-slate-900">Create a free account</Link></li>
            <li><Link to="/login" className="hover:text-slate-900">Log in</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-900">For businesses</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li><Link to="/pricing" className="hover:text-slate-900">Pricing</Link></li>
            <li><Link to="/register/business" className="hover:text-slate-900">List your business</Link></li>
            <li><Link to="/about" className="hover:text-slate-900">About us</Link></li>
            <li><Link to="/contact" className="hover:text-slate-900">Contact</Link></li>
          </ul>
        </div>
      </div>
      <p className="border-t border-slate-100 py-4 text-center text-xs text-slate-500">© {new Date().getFullYear()} Quick Quote</p>
    </footer>
  );
}
