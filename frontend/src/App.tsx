import { BrowserRouter } from 'react-router';
import { ScrollToTop } from './components/layout/ScrollToTop';
import { AuthProvider } from './context/AuthProvider';
import { AppRoutes } from './router';

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ScrollToTop />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
