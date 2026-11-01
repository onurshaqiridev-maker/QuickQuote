/**
 * Every page of the website and its URL (see docs/FEATURES.md, section 7).
 * Dashboards are wrapped in <ProtectedRoute> so only the right role can open them.
 */
import { Route, Routes } from 'react-router';
import { GuestOnlyRoute, ProtectedRoute } from './components/guards/ProtectedRoute';
import { DashboardLayout, type DashboardNavItem } from './components/layout/DashboardLayout';
import { PublicLayout } from './components/layout/PublicLayout';
import { AdminBusinessDetailPage } from './pages/admin/AdminBusinessDetailPage';
import { AdminOverviewPage } from './pages/admin/AdminOverviewPage';
import { AdminQuoteRequestsPage } from './pages/admin/AdminQuoteRequestsPage';
import { AdminReservationsPage } from './pages/admin/AdminReservationsPage';
import { ManageBusinessesPage } from './pages/admin/ManageBusinessesPage';
import { ManageCategoriesPage } from './pages/admin/ManageCategoriesPage';
import { ManageCustomersPage } from './pages/admin/ManageCustomersPage';
import { ManageSubscriptionsPage } from './pages/admin/ManageSubscriptionsPage';
import { BusinessRegisterPage } from './pages/auth/BusinessRegisterPage';
import { CustomerRegisterPage } from './pages/auth/CustomerRegisterPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { LoginPage } from './pages/auth/LoginPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { VerifyEmailPage } from './pages/auth/VerifyEmailPage';
import { BusinessOverviewPage } from './pages/business/BusinessOverviewPage';
import { BusinessQuoteRequestsPage } from './pages/business/BusinessQuoteRequestsPage';
import { BusinessReservationsPage } from './pages/business/BusinessReservationsPage';
import { BusinessSettingsPage } from './pages/business/BusinessSettingsPage';
import { EditProfilePage } from './pages/business/EditProfilePage';
import { ManageServicesPage } from './pages/business/ManageServicesPage';
import { SubscriptionPage } from './pages/business/SubscriptionPage';
import { WorkingHoursPage } from './pages/business/WorkingHoursPage';
import { CustomerOverviewPage } from './pages/customer/CustomerOverviewPage';
import { CustomerSettingsPage } from './pages/customer/CustomerSettingsPage';
import { MyQuoteRequestsPage } from './pages/customer/MyQuoteRequestsPage';
import { MyReservationsPage } from './pages/customer/MyReservationsPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { AboutPage } from './pages/public/AboutPage';
import { BusinessDetailsPage } from './pages/public/BusinessDetailsPage';
import { ContactPage } from './pages/public/ContactPage';
import { ExplorePage } from './pages/public/ExplorePage';
import { HomePage } from './pages/public/HomePage';
import { PricingPage } from './pages/public/PricingPage';

const CUSTOMER_NAV: DashboardNavItem[] = [
  { to: '/account', label: 'Overview', end: true },
  { to: '/account/reservations', label: 'My reservations' },
  { to: '/account/quotes', label: 'My quote requests' },
  { to: '/account/settings', label: 'Settings' },
];

const BUSINESS_NAV: DashboardNavItem[] = [
  { to: '/dashboard', label: 'Overview', end: true },
  { to: '/dashboard/profile', label: 'Business profile' },
  { to: '/dashboard/services', label: 'Services' },
  { to: '/dashboard/hours', label: 'Working hours' },
  { to: '/dashboard/reservations', label: 'Reservations' },
  { to: '/dashboard/quotes', label: 'Quote requests' },
  { to: '/dashboard/subscription', label: 'Subscription' },
  { to: '/dashboard/settings', label: 'Settings' },
];

const ADMIN_NAV: DashboardNavItem[] = [
  { to: '/admin', label: 'Overview', end: true },
  { to: '/admin/businesses', label: 'Businesses' },
  { to: '/admin/customers', label: 'Customers' },
  { to: '/admin/reservations', label: 'Reservations' },
  { to: '/admin/quotes', label: 'Quote requests' },
  { to: '/admin/subscriptions', label: 'Subscriptions' },
  { to: '/admin/categories', label: 'Categories' },
];

export function AppRoutes() {
  return (
    <Routes>
      {/* Public pages */}
      <Route element={<PublicLayout />}>
        <Route index element={<HomePage />} />
        <Route path="explore" element={<ExplorePage />} />
        <Route path="businesses/:slug" element={<BusinessDetailsPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="pricing" element={<PricingPage />} />

        {/* Authentication (logged-in users are sent to their dashboard) */}
        <Route path="register" element={<GuestOnlyRoute><CustomerRegisterPage /></GuestOnlyRoute>} />
        <Route path="register/business" element={<GuestOnlyRoute><BusinessRegisterPage /></GuestOnlyRoute>} />
        <Route path="login" element={<GuestOnlyRoute><LoginPage /></GuestOnlyRoute>} />
        <Route path="forgot-password" element={<GuestOnlyRoute><ForgotPasswordPage /></GuestOnlyRoute>} />
        <Route path="reset-password" element={<ResetPasswordPage />} />
        <Route path="verify-email" element={<VerifyEmailPage />} />

        <Route path="*" element={<NotFoundPage />} />
      </Route>

      {/* Customer dashboard */}
      <Route path="account" element={<ProtectedRoute roles={['customer']}><DashboardLayout title="My account" items={CUSTOMER_NAV} /></ProtectedRoute>}>
        <Route index element={<CustomerOverviewPage />} />
        <Route path="reservations" element={<MyReservationsPage />} />
        <Route path="quotes" element={<MyQuoteRequestsPage />} />
        <Route path="settings" element={<CustomerSettingsPage />} />
      </Route>

      {/* Business dashboard */}
      <Route path="dashboard" element={<ProtectedRoute roles={['business_owner']}><DashboardLayout title="Business dashboard" items={BUSINESS_NAV} /></ProtectedRoute>}>
        <Route index element={<BusinessOverviewPage />} />
        <Route path="profile" element={<EditProfilePage />} />
        <Route path="services" element={<ManageServicesPage />} />
        <Route path="hours" element={<WorkingHoursPage />} />
        <Route path="reservations" element={<BusinessReservationsPage />} />
        <Route path="quotes" element={<BusinessQuoteRequestsPage />} />
        <Route path="subscription" element={<SubscriptionPage />} />
        <Route path="settings" element={<BusinessSettingsPage />} />
      </Route>

      {/* Admin dashboard */}
      <Route path="admin" element={<ProtectedRoute roles={['admin']}><DashboardLayout title="Administration" items={ADMIN_NAV} /></ProtectedRoute>}>
        <Route index element={<AdminOverviewPage />} />
        <Route path="businesses" element={<ManageBusinessesPage />} />
        <Route path="businesses/:id" element={<AdminBusinessDetailPage />} />
        <Route path="customers" element={<ManageCustomersPage />} />
        <Route path="reservations" element={<AdminReservationsPage />} />
        <Route path="quotes" element={<AdminQuoteRequestsPage />} />
        <Route path="subscriptions" element={<ManageSubscriptionsPage />} />
        <Route path="categories" element={<ManageCategoriesPage />} />
      </Route>
    </Routes>
  );
}
