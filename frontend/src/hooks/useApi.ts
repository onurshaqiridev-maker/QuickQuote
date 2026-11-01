import { useCallback, useEffect, useRef, useState } from 'react';
import { errorMessage } from '../api/client';

interface ApiState<T> {
  data: T | undefined;
  error: string | null;
  loading: boolean;
  /** Load the data again (e.g. after a change). */
  reload: () => void;
}

interface Result<T> {
  requestKey: string;
  data: T | undefined;
  error: string | null;
}

/**
 * Loads data from the API and keeps track of loading / error states.
 *
 * `key` describes WHAT is loaded. When it changes, the data is loaded again:
 *
 *   const plans = useApi('plans', () => publicApi.plans());
 *   const jobs  = useApi(`email-jobs/${status}/${page}`, () => adminApi.emailJobs(status, page));
 */
export function useApi<T>(key: string, load: () => Promise<T>): ApiState<T> {
  const [version, setVersion] = useState(0);
  const [result, setResult] = useState<Result<T> | null>(null);
  const requestKey = `${key}#${version}`;

  // Always call the newest `load` function, without re-running the effect on every render.
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });

  useEffect(() => {
    let cancelled = false; // ignore answers that arrive after the key changed or the page closed
    loadRef
      .current()
      .then((data) => {
        if (!cancelled) setResult({ requestKey, data, error: null });
      })
      .catch((err: unknown) => {
        if (!cancelled) setResult({ requestKey, data: undefined, error: errorMessage(err) });
      });
    return () => {
      cancelled = true;
    };
  }, [requestKey]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  const loading = result?.requestKey !== requestKey;
  // While reloading, keep showing the previous data so the page does not jump.
  return { data: result?.data, error: loading ? null : (result?.error ?? null), loading, reload };
}
