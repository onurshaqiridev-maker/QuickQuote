import { useState } from 'react';
import { adminApi } from '../../api/admin.api';
import { errorMessage } from '../../api/client';
import { Alert } from '../../components/ui/Alert';
import { StatusBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardTitle } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { Spinner } from '../../components/ui/Spinner';
import { useApi } from '../../hooks/useApi';
import type { EmailJobStatus } from '../../types/api';
import { formatDateTime } from '../../utils/format';

const FILTERS: { label: string; value?: EmailJobStatus }[] = [
  { label: 'All' },
  { label: 'Pending', value: 'pending' },
  { label: 'Sent', value: 'sent' },
  { label: 'Failed', value: 'failed' },
];

function StatTile({ label, value, tone }: { label: string; value: number | undefined; tone: string }) {
  return (
    <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${tone}`}>{value ?? '–'}</p>
    </div>
  );
}

export function AdminOverviewPage() {
  const [filter, setFilter] = useState<EmailJobStatus | undefined>();
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [retrying, setRetrying] = useState<string | null>(null);
  const stats = useApi('email-queue-stats', () => adminApi.emailQueueStats());
  const jobs = useApi(`email-jobs/${filter ?? 'all'}/${page}`, () => adminApi.emailJobs(filter, page));

  const retry = async (id: string) => {
    setRetrying(id);
    try {
      await adminApi.retryEmailJob(id);
      setNotice({ tone: 'success', text: 'The email is back in the queue. The worker will try again in a few seconds.' });
      stats.reload();
      jobs.reload();
    } catch (error) {
      setNotice({ tone: 'error', text: errorMessage(error) });
    } finally {
      setRetrying(null);
    }
  };

  const totalPages = jobs.data ? Math.max(1, Math.ceil(jobs.data.meta.total / jobs.data.meta.pageSize)) : 1;

  return (
    <>
      <PageHeader title="Admin overview" description="Platform health and the email queue." action={<Button variant="secondary" onClick={() => { stats.reload(); jobs.reload(); }}>Refresh</Button>} />
      <section aria-label="Email queue numbers" className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Emails waiting (pending)" value={stats.data?.pending} tone="text-amber-600" />
        <StatTile label="Emails sent" value={stats.data?.sent} tone="text-green-600" />
        <StatTile label="Emails failed" value={stats.data?.failed} tone="text-red-600" />
      </section>

      <Card>
        <CardTitle
          action={
            <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
              {FILTERS.map((f) => (
                <button
                  key={f.label}
                  type="button"
                  onClick={() => { setFilter(f.value); setPage(1); }}
                  className={`rounded-md px-3 py-1 text-sm font-medium ${filter === f.value ? 'bg-white shadow-sm' : 'text-slate-600'}`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          }
        >
          Email queue
        </CardTitle>
        {notice && <div className="mb-4"><Alert tone={notice.tone}>{notice.text}</Alert></div>}
        {jobs.loading && <Spinner />}
        {jobs.error && <Alert tone="error">{jobs.error}</Alert>}
        {jobs.data && jobs.data.data.length === 0 && <p className="text-sm text-slate-500">No emails here.</p>}
        {jobs.data && jobs.data.data.length > 0 && (
          <div className="-mx-6 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-y border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-6 py-3">Email</th>
                  <th className="px-3 py-3">To</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Attempts</th>
                  <th className="px-3 py-3">Created</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {jobs.data.data.map((job) => (
                  <tr key={job.id} className="align-top">
                    <td className="px-6 py-3 font-mono text-xs">{job.template}</td>
                    <td className="px-3 py-3">{job.toEmail}</td>
                    <td className="px-3 py-3">
                      <StatusBadge status={job.status} />
                      {job.lastError && <p className="mt-1 max-w-xs text-xs text-red-600">{job.lastError}</p>}
                    </td>
                    <td className="px-3 py-3">{job.attempts} / {job.maxAttempts}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-slate-500">{formatDateTime(job.createdAt)}</td>
                    <td className="px-6 py-3 text-right">
                      {job.status === 'failed' && (
                        <Button variant="secondary" onClick={() => retry(job.id)} loading={retrying === job.id}>Retry</Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {jobs.data && totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between text-sm">
            <Button variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
            <span className="text-slate-500">Page {page} of {totalPages}</span>
            <Button variant="secondary" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Button>
          </div>
        )}
      </Card>
    </>
  );
}
