import { Check } from 'lucide-react';
import { Link } from 'react-router';
import type { ChecklistItem, ChecklistKey } from '../../types/api';
import { Card, CardTitle } from '../ui/Card';

/** Where the owner can fix each checklist item. */
const LINKS: Partial<Record<ChecklistKey, { to: string; label: string }>> = {
  subscription: { to: '/dashboard/subscription', label: 'Choose a plan' },
  profile: { to: '/dashboard/profile', label: 'Edit profile' },
  categories: { to: '/dashboard/profile#categories', label: 'Choose categories' },
  services: { to: '/dashboard/services', label: 'Add a service' },
  working_hours: { to: '/dashboard/hours', label: 'Set hours' },
  published: { to: '/dashboard/profile#publish', label: 'Publish' },
};

const NOTES: Partial<Record<ChecklistKey, string>> = {
  email_verified: 'Use the link in your email',
  approved: 'Our team reviews new businesses',
};

export function GoLiveChecklist({ items }: { items: ChecklistItem[] }) {
  const doneCount = items.filter((item) => item.done).length;
  return (
    <Card>
      <CardTitle action={<span className="text-sm text-slate-500">{doneCount} of {items.length} done</span>}>Go-live checklist</CardTitle>
      <div className="mb-5 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${(doneCount / items.length) * 100}%` }} />
      </div>
      <ul className="divide-y divide-slate-100">
        {items.map((item) => {
          const link = LINKS[item.key];
          return (
            <li key={item.key} className="flex items-center gap-3 py-3 text-sm">
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${item.done ? 'bg-green-100 text-green-700' : 'border-2 border-slate-200'}`} aria-hidden>
                {item.done && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
              </span>
              <span className={item.done ? 'text-slate-500 line-through' : 'text-slate-800'}>
                {item.label}
                {item.key === 'approved' && !item.done && <span className="ml-2 text-xs text-slate-400">(needed to be visible)</span>}
              </span>
              <span className="ml-auto shrink-0 text-xs text-slate-500">
                {!item.done && link ? (
                  <Link to={link.to} className="font-semibold text-brand-700 hover:underline">{link.label}</Link>
                ) : !item.done ? (
                  NOTES[item.key]
                ) : null}
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
