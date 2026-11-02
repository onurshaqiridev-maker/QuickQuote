import { useEffect } from 'react';

const SITE = 'Quotiva';

/** Sets the browser tab title, e.g. "Explore businesses | Quotiva". Without a title: just the site name. */
export function usePageTitle(title?: string | null): void {
  const full = title ? `${title} | ${SITE}` : `${SITE}: find local businesses, request quotes and book`;
  useEffect(() => {
    document.title = full;
  }, [full]);
}
