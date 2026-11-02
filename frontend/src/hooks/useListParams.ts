import { useSearchParams } from 'react-router';

/**
 * Filters for list pages live in the page address (e.g. /admin/customers?role=customer&page=2),
 * so a refresh or a shared link shows the same list.
 */
export function useListParams() {
  const [params, setParams] = useSearchParams();

  /** Sets (or removes, when empty) the given filters. Changing a filter goes back to page 1. */
  const update = (changes: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    if (!('page' in changes)) next.delete('page');
    setParams(next);
  };

  return {
    get: (key: string) => params.get(key) ?? '',
    page: Math.max(1, Number(params.get('page')) || 1),
    update,
  };
}
