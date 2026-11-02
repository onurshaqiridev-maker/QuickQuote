import type { ReactNode } from 'react';

type Color = 'gray' | 'green' | 'amber' | 'red' | 'blue';

const COLORS: Record<Color, string> = {
  gray: 'bg-slate-100 text-slate-700',
  green: 'bg-green-100 text-green-800',
  amber: 'bg-amber-100 text-amber-800',
  red: 'bg-red-100 text-red-800',
  blue: 'bg-brand-100 text-brand-700',
};

export function Badge({ color = 'gray', children }: { color?: Color; children: ReactNode }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${COLORS[color]}`}>{children}</span>;
}

/** Coloured badge for any status value used in Quotiva. */
export function StatusBadge({ status }: { status: string }) {
  const color: Color =
    ['sent', 'approved', 'active', 'confirmed', 'completed'].includes(status)
      ? 'green'
      : ['pending', 'pending_review', 'processing', 'past_due'].includes(status)
        ? 'amber'
        : ['failed', 'rejected', 'suspended', 'deactivated', 'cancelled', 'expired'].includes(status)
          ? 'red'
          : 'gray';
  return <Badge color={color}>{status.replace(/_/g, ' ')}</Badge>;
}
