import { useEffect } from 'react';

const SITE = 'Quick Quote';

/** Sets the browser tab title, e.g. "Explore businesses | Quick Quote". Without a title: just the site name. */
export function usePageTitle(title?: string | null): void {
  const full = title ? `${title} | ${SITE}` : `${SITE}: find local businesses, request quotes and book`;
  useEffect(() => {
    document.title = full;
  }, [full]);
}
