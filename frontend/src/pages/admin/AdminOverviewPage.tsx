import { useState } from 'react';
import { Link } from 'react-router';
import { adminApi } from '../../api/admin.api';
import { errorMessage } from '../../api/client';
import { Alert } from '../../components/ui/Alert';
import { StatusBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardTitle } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { Pagination } from '../../components/ui/Pagination';
import { Spinner } from '../../components/ui/Spinner';
import { Tabs, type TabItem } from '../../components/ui/Tabs';
import { useApi } from '../../hooks/useApi';
import type { EmailJobStatus } from '../../types/api';
import { activityReason, describeActivity } from '../../utils/activity';
import { formatDateTime } from '../../utils/format';

type EmailFilter = EmailJobStatus | 'all';
const EMAIL_TABS: TabItem<EmailFilter>[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'sent', label: 'Sent' },
  { value: 'failed', label: 'Failed' },
];

function StatTile({ label, value, detail, to, tone = 'text-slate-900' }: { label: string; value: number | undefined; detail?: string; to: string; tone?: string }) {
  return (
    <Link to={to} className="rounded-2xl bg-white p-5 ring-1 ring-slate-200 hover:ring-brand-500">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${tone}`}>{value ?? '–'}</p>
      {detail && <p className="mt-1 text-xs text-slate-500">{detail}</p>}
    </Link>
  );
}

function RecentActivity() {
  const [page, setPage] = useState(1);
  const activity = useApi(`admin-activity/${page}`, () => adminApi.activity(page));
  return (
    <Card>
      <CardTitle>Recent activity</CardTitle>
      {activity.loading && !activity.data && <Spinner />}
      {activity.error && <Alert tone="error">{activity.error}</Alert>}
      {activity.data && activity.data.data.length === 0 && <p className="text-sm text-slate-500">Nothing has happened yet.</p>}
      {activity.data && activity.data.data.length > 0 && (
        <ol className="divide-y divide-slate-100">
          {activity.data.data.map((item) => {
            const reason = activityReason(item);
            return (
              <li key={item.id} className="flex flex-col gap-1 py-2.5 text-sm sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                <span className="text-slate-800">
                  {describeActivity(item)}
                  {reason && <span className="text-slate-500"> (reason: {reason})</span>}
                </span>
                <span className="shrink-0 text-xs text-slate-500">{formatDateTime(item.createdAt)}</span>
              </li>
            );
          })}
        </ol>
      )}
      {activity.data && (
        <div className="mt-4">
          <Pagination page={page} total={activity.data.meta.total} pageSize={activity.data.meta.pageSize} onChange={setPage} />
        </div>
      )}
    </Card>
  );
}

function EmailQueue({ onChanged }: { onChanged: () => void }) {
  const [filter, setFilter] = useState<EmailFilter>('all');
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [retrying, setRetrying] = useState<string | null>(null);
  const status = filter === 'all' ? undefined : filter;
  const jobs = useApi(`email-jobs/${filter}/${page}`, () => adminApi.emailJobs(status, page));

  const retry = async (id: string) => {
    setRetrying(id);
    try {
      await adminApi.retryEmailJob(id);
      setNotice({ tone: 'success', text: 'The email is back in the queue. The worker will try again in a few seconds.' });
      onChanged();
      jobs.reload();
    } catch (error) {
      setNotice({ tone: 'error', text: errorMessage(error) });
    } finally {
      setRetrying(null);
    }
  };

  return (
    <Card>
      <CardTitle action={<Tabs tabs={EMAIL_TABS} active={filter} onChange={(value) => { setFilter(value); setPage(1); }} />}>Email queue</CardTitle>
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
                    {job.status === 'failed' && <Button variant="secondary" onClick={() => retry(job.id)} loading={retrying === job.id}>Retry</Button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {jobs.data && (
        <div className="mt-4">
          <Pagination page={page} total={jobs.data.meta.total} pageSize={jobs.data.meta.pageSize} onChange={setPage} />
        </div>
      )}
    </Card>
  );
}

export function AdminOverviewPage() {
  const stats = useApi('admin-stats', () => adminApi.stats());
  const emailStats = useApi('email-queue-stats', () => adminApi.emailQueueStats());
  const s = stats.data;
  const waiting = s?.businesses.pending_review ?? 0;

  return (
    <>
      <PageHeader
        title="Admin overview"
        description="Platform numbers, recent activity and the email queue."
        action={<Button variant="secondary" onClick={() => { stats.reload(); emailStats.reload(); }}>Refresh</Button>}
      />
      {stats.error && <Alert tone="error">{stats.error}</Alert>}

      {waiting > 0 && (
        <Link to="/admin/businesses?status=pending_review" className="flex items-center justify-between rounded-2xl bg-amber-50 p-5 ring-1 ring-amber-200 hover:ring-amber-400">
          <div>
            <p className="text-sm text-amber-800">Businesses waiting for review</p>
            <p className="mt-1 text-3xl font-bold text-amber-700">{waiting}</p>
          </div>
          <span className="text-sm font-semibold text-amber-800">Review now</span>
        </Link>
      )}

      <section aria-label="Platform numbers" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Customers" value={s?.users.customers} detail={s ? `${s.users.suspended} suspended account${s.users.suspended === 1 ? '' : 's'}` : undefined} to="/admin/customers" />
        <StatTile label="Businesses live" value={s?.businesses.visible} detail={s ? `${s.businesses.approved} approved, ${s.businesses.suspended} suspended` : undefined} to="/admin/businesses" tone="text-green-700" />
        <StatTile label="Reservations this week" value={s?.reservations.createdThisWeek} detail={s ? `${s.reservations.pending} waiting for the business` : undefined} to="/admin/reservations" />
        <StatTile label="Quote requests this week" value={s?.quotes.createdThisWeek} detail={s ? `${s.quotes.open} still open` : undefined} to="/admin/quotes" />
      </section>

      <section aria-label="Email queue numbers" className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200"><p className="text-sm text-slate-500">Emails waiting (pending)</p><p className="mt-1 text-3xl font-bold text-amber-600">{emailStats.data?.pending ?? '–'}</p></div>
        <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200"><p className="text-sm text-slate-500">Emails sent</p><p className="mt-1 text-3xl font-bold text-green-600">{emailStats.data?.sent ?? '–'}</p></div>
        <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200"><p className="text-sm text-slate-500">Emails failed</p><p className="mt-1 text-3xl font-bold text-red-600">{emailStats.data?.failed ?? '–'}</p></div>
      </section>

      <RecentActivity />
      <EmailQueue onChanged={emailStats.reload} />
    </>
  );
}
