import type { QuoteDecision, QuoteStatus } from '../../types/api';
import { Badge } from '../ui/Badge';

type Color = 'gray' | 'green' | 'amber' | 'red' | 'blue';

/** The same status, in the words each side understands best (docs/USER_FLOWS.md 7.3). */
const LABELS: Record<QuoteStatus, { customer: string; business: string; color: Color }> = {
  pending: { customer: 'Sent', business: 'New', color: 'amber' },
  processing: { customer: 'In progress', business: 'In progress', color: 'blue' },
  completed: { customer: 'Quote received', business: 'Answered', color: 'green' },
  rejected: { customer: 'Declined', business: 'Declined', color: 'red' },
};

export function QuoteStatusBadge({ status, viewer }: { status: QuoteStatus; viewer: 'customer' | 'business' }) {
  const label = LABELS[status];
  return <Badge color={label.color}>{label[viewer]}</Badge>;
}

/** "Accepted" / "Declined by customer" after the customer answered a quote. */
export function DecisionBadge({ decision, viewer }: { decision: QuoteDecision; viewer: 'customer' | 'business' }) {
  if (decision === 'accepted') return <Badge color="green">{viewer === 'customer' ? 'You accepted' : 'Accepted by customer'}</Badge>;
  return <Badge>{viewer === 'customer' ? 'You declined' : 'Declined by customer'}</Badge>;
}
