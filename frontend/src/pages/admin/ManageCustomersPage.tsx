import { useState } from 'react';
import { Link } from 'react-router';
import { adminApi } from '../../api/admin.api';
import { errorMessage } from '../../api/client';
import { Alert } from '../../components/ui/Alert';
import { Badge, StatusBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { TextField } from '../../components/ui/FormField';
import { PageHeader } from '../../components/ui/PageHeader';
import { Pagination } from '../../components/ui/Pagination';
import { SearchBox } from '../../components/ui/SearchBox';
import { Spinner } from '../../components/ui/Spinner';
import { Tabs, type TabItem } from '../../components/ui/Tabs';
import { useApi } from '../../hooks/useApi';
import { useListParams } from '../../hooks/useListParams';
import type { AdminUserListItem, UserRole } from '../../types/api';
import { formatDateTime, plural } from '../../utils/format';
import { ROLE_LABELS } from '../../utils/roles';

const ROLE_TABS: TabItem<UserRole | 'all'>[] = [
  { value: 'all', label: 'Everyone' },
  { value: 'customer', label: 'Customers' },
  { value: 'business_owner', label: 'Business owners' },
  { value: 'admin', label: 'Admins' },
];

/** The details under a user's row: counts, their business, and suspend / reactivate. */
function UserDetails({ user, onChanged }: { user: AdminUserListItem; onChanged: () => void }) {
  const detail = useApi(`admin-user/${user.id}`, () => adminApi.user(user.id));
  const [reason, setReason] = useState('');
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      setAsking(false);
      setReason('');
      detail.reload();
      onChanged();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (!detail.data) return detail.error ? <Alert tone="error">{detail.error}</Alert> : <Spinner />;
  const d = detail.data;
  return (
    <div className="space-y-3 text-sm">
      <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-3">
        <div><dt className="text-slate-500">Phone</dt><dd>{d.phone ?? 'Not given'}</dd></div>
        <div><dt className="text-slate-500">Last login</dt><dd>{d.lastLoginAt ? formatDateTime(d.lastLoginAt) : 'Never'}</dd></div>
        {d.role === 'customer' && <div><dt className="text-slate-500">Activity</dt><dd>{plural(d.counts.reservations, 'reservation')}, {plural(d.counts.quoteRequests, 'quote request')}</dd></div>}
        {d.business && (
          <div>
            <dt className="text-slate-500">Business</dt>
            <dd className="flex items-center gap-2">
              <Link to={`/admin/businesses/${d.business.id}`} className="font-medium text-brand-700 hover:underline">{d.business.displayName}</Link>
              <StatusBadge status={d.business.status} />
            </dd>
          </div>
        )}
      </dl>
      {d.status === 'suspended' && d.statusReason && <p className="rounded-lg bg-red-50 p-3 text-red-800">Suspended because: {d.statusReason}</p>}
      {error && <Alert tone="error">{error}</Alert>}
      {d.role !== 'admin' && d.status === 'active' && !asking && (
        <Button variant="secondary" onClick={() => setAsking(true)}>Suspend account</Button>
      )}
      {asking && (
        <div className="space-y-3 rounded-xl bg-red-50 p-4">
          <p className="font-medium text-red-800">
            {d.fullName} will be logged out and cannot log in until you reactivate the account.
            {d.business && ' Their business will be hidden from the website.'}
          </p>
          <TextField label="Reason (kept in the activity log)" value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} />
          <div className="flex gap-2">
            <Button variant="danger" loading={busy} onClick={() => run(() => adminApi.suspendUser(d.id, reason))}>Suspend</Button>
            <Button variant="secondary" onClick={() => setAsking(false)}>Back</Button>
          </div>
        </div>
      )}
      {d.status === 'suspended' && (
        <Button loading={busy} onClick={() => run(() => adminApi.reactivateUser(d.id))}>Reactivate account</Button>
      )}
    </div>
  );
}

export function ManageCustomersPage() {
  const { get, page, update } = useListParams();
  const role = (get('role') || 'all') as UserRole | 'all';
  const status = get('status');
  const search = get('search');
  const [openId, setOpenId] = useState<string | null>(null);
  const list = useApi(`admin-users/${role}/${status}/${search}/${page}`, () =>
    adminApi.users({ role: role === 'all' ? undefined : role, status, search, page }),
  );

  return (
    <>
      <PageHeader title="Customers and users" description="Find any account, see what they did, and suspend or reactivate it." />
      <Card>
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Tabs tabs={ROLE_TABS} active={role} onChange={(value) => update({ role: value === 'all' ? undefined : value })} />
          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              aria-label="Account status"
              value={status}
              onChange={(e) => update({ status: e.target.value })}
              className="rounded-lg border-0 py-2 pr-8 pl-3 text-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600"
            >
              <option value="">Any status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
            <SearchBox label="Search users" placeholder="Name or email" initial={search} onSearch={(text) => update({ search: text })} />
          </div>
        </div>

        {list.loading && !list.data && <Spinner />}
        {list.error && <Alert tone="error">{list.error}</Alert>}
        {list.data && list.data.data.length === 0 && <p className="py-6 text-center text-sm text-slate-500">No accounts found.</p>}
        {list.data && list.data.data.length > 0 && (
          <div className={`-mx-6 overflow-x-auto transition-opacity ${list.loading ? 'opacity-60' : ''}`} aria-busy={list.loading}>
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-y border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-6 py-3">Name</th>
                  <th className="px-3 py-3">Role</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Registered</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.data.data.map((user) => (
                  <UserRow key={user.id} user={user} open={openId === user.id} onToggle={() => setOpenId(openId === user.id ? null : user.id)} onChanged={list.reload} />
                ))}
              </tbody>
            </table>
          </div>
        )}
        {list.data && (
          <div className="mt-4">
            <Pagination page={page} total={list.data.meta.total} pageSize={list.data.meta.pageSize} onChange={(p) => update({ page: String(p) })} />
          </div>
        )}
      </Card>
    </>
  );
}

function UserRow({ user, open, onToggle, onChanged }: { user: AdminUserListItem; open: boolean; onToggle: () => void; onChanged: () => void }) {
  return (
    <>
      <tr className="align-top">
        <td className="px-6 py-3">
          <p className="font-medium text-slate-900">{user.fullName}</p>
          <p className="text-xs text-slate-500">{user.email} {!user.emailVerified && <span className="text-amber-700">(not confirmed)</span>}</p>
        </td>
        <td className="px-3 py-3"><Badge color={user.role === 'admin' ? 'blue' : 'gray'}>{ROLE_LABELS[user.role]}</Badge></td>
        <td className="px-3 py-3"><StatusBadge status={user.status} /></td>
        <td className="px-3 py-3 whitespace-nowrap text-slate-500">{formatDateTime(user.createdAt)}</td>
        <td className="px-6 py-3 text-right">
          <button type="button" onClick={onToggle} aria-expanded={open} className="font-semibold text-brand-700 hover:underline">
            {open ? 'Close' : 'Details'}
          </button>
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={5} className="bg-slate-50 px-6 py-4">
            <UserDetails user={user} onChanged={onChanged} />
          </td>
        </tr>
      )}
    </>
  );
}
