import { useEffect } from 'react';
import { useLocation } from 'react-router';

/** Scrolls to the top when the page (URL path) changes, like a normal website. */
export function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
