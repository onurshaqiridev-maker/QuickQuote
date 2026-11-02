import { describe, expect, it } from 'vitest';
import type { AdminActivityItem } from '../types/api';
import { activityReason, describeActivity } from './activity';

const item = (changes: Partial<AdminActivityItem>): AdminActivityItem => ({
  id: '1',
  action: 'quote.created',
  entityType: 'quote_request',
  entityId: 'q1',
  entityLabel: 'Hair colour (Bella Hair Studio)',
  actor: { id: 'u1', fullName: 'Sara Miller', role: 'customer' },
  metadata: {},
  createdAt: '2026-11-02T10:00:00Z',
  ...changes,
});

describe('describeActivity', () => {
  it('builds a sentence from who, what and which', () => {
    expect(describeActivity(item({}))).toBe('Sara Miller asked for a quote: Hair colour (Bella Hair Studio)');
  });

  it('names the system when nobody did it, and uses the saved name of deleted things', () => {
    expect(describeActivity(item({ actor: null, action: 'reservation.expired', entityLabel: "Women's haircut at Bella" })))
      .toBe("The system expired the unanswered booking Women's haircut at Bella");
    expect(describeActivity(item({ action: 'category.deleted', entityLabel: null, metadata: { name: 'Pets' } })))
      .toBe('Sara Miller deleted the category Pets');
  });

  it('shows unknown actions as they are, and the reason when there is one', () => {
    expect(describeActivity(item({ action: 'something.new', entityLabel: null }))).toBe('Sara Miller something.new');
    expect(activityReason(item({ metadata: { reason: 'Spam' } }))).toBe('Spam');
    expect(activityReason(item({}))).toBeNull();
  });
});
