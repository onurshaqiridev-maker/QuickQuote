import { Check } from 'lucide-react';
import { Link } from 'react-router';
import { StatusBadge } from '../../components/ui/Badge';
import { Card, CardTitle } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { useAuth } from '../../hooks/useAuth';

interface ChecklistItem {
  label: string;
  done: boolean;
  /** Where to fix it, or which phase brings it */
  to?: string;
  note?: string;
}

/** The "go-live checklist" from USER_FLOWS.md: what is missing before the profile is public. */
function GoLiveChecklist({ items }: { items: ChecklistItem[] }) {
  const doneCount = items.filter((item) => item.done).length;
  return (
    <Card>
      <CardTitle action={<span className="text-sm text-slate-500">{doneCount} of {items.length} done</span>}>Go-live checklist</CardTitle>
      <div className="mb-5 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${(doneCount / items.length) * 100}%` }} />
      </div>
      <ul className="divide-y divide-slate-100">
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-3 py-3 text-sm">
            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${item.done ? 'bg-green-100 text-green-700' : 'border-2 border-slate-200'}`} aria-hidden>
              {item.done && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
            </span>
            <span className={item.done ? 'text-slate-500 line-through' : 'text-slate-800'}>{item.label}</span>
            <span className="ml-auto text-xs text-slate-500">
              {item.to && !item.done ? <Link to={item.to} className="font-semibold text-brand-700 hover:underline">Open</Link> : item.note}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function BusinessOverviewPage() {
  const { user, business } = useAuth();
  if (!user || !business) return null;

  const checklist: ChecklistItem[] = [
    { label: 'Confirm your email address', done: user.emailVerified, note: user.emailVerified ? undefined : 'See the banner above' },
    { label: 'Choose a plan and pay', done: false, to: '/dashboard/subscription' },
    { label: 'Complete your profile (description, city, logo)', done: false, to: '/dashboard/profile' },
    { label: 'Add at least one service', done: false, to: '/dashboard/services' },
    { label: 'Set your working hours', done: false, to: '/dashboard/hours' },
    { label: 'Approved by the Quick Quote team', done: business.status === 'approved', note: business.status === 'pending_review' ? 'We review new businesses' : undefined },
    { label: 'Publish your profile', done: business.isPublished, to: '/dashboard/profile' },
  ];

  return (
    <>
      <PageHeader title={business.displayName} description={<span className="flex flex-wrap items-center gap-2">Business status: <StatusBadge status={business.status} /> · Public address: <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">/businesses/{business.slug}</code></span>} />
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <GoLiveChecklist items={checklist} />
        </div>
        <div className="space-y-6">
          <Card>
            <h2 className="font-semibold">Today</h2>
            <p className="mt-2 text-sm text-slate-600">No appointments yet. Reservations arrive in phase 8.</p>
          </Card>
          <Card>
            <h2 className="font-semibold">New quote requests</h2>
            <p className="mt-2 text-sm text-slate-600">None yet. Quote requests arrive in phase 9.</p>
          </Card>
          <Card>
            <h2 className="font-semibold">Subscription</h2>
            <p className="mt-2 text-sm text-slate-600">No plan chosen yet. <Link to="/pricing" className="font-semibold text-brand-700 hover:underline">Compare plans</Link></p>
          </Card>
        </div>
      </div>
    </>
  );
}
