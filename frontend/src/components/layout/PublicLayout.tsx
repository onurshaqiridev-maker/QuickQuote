import { Outlet } from 'react-router';
import { Footer } from './Footer';
import { Navbar } from './Navbar';

/** Layout for public pages: top navigation, page content, footer. */
export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

/** Centred page content with the usual side padding. */
export function Container({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 ${className}`}>{children}</div>;
}
