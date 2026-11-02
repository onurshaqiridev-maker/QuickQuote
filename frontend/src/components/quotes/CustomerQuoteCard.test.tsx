import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { customerApi } from '../../api/customer.api';
import type { CustomerQuote } from '../../types/api';
import { CustomerQuoteCard } from './CustomerQuoteCard';

vi.mock('../../api/customer.api', () => ({ customerApi: { decideQuote: vi.fn() } }));

const answered: CustomerQuote = {
  id: 'q1',
  status: 'completed',
  subject: 'Renovate small bathroom',
  description: 'About 5 square metres.',
  preferredDate: null,
  budgetCents: 500000,
  service: null,
  quotedPriceCents: 460000,
  businessMessage: 'Materials and labour included.',
  respondedAt: '2026-11-02T10:00:00Z',
  customerDecision: null,
  customerDecidedAt: null,
  createdAt: '2026-11-01T10:00:00Z',
  business: { slug: 'quick-fix', displayName: 'Quick Fix Plumbing', logoUrl: null, city: 'Munich', phone: '+49 89 1', email: 'fix@example.com' },
  canDecide: true,
};

function renderCard(quote: CustomerQuote, onChanged = vi.fn()) {
  render(<MemoryRouter><ul><CustomerQuoteCard quote={quote} onChanged={onChanged} /></ul></MemoryRouter>);
  return onChanged;
}

describe('CustomerQuoteCard', () => {
  beforeEach(() => vi.mocked(customerApi.decideQuote).mockReset());

  it('shows the quoted price and message', () => {
    renderCard(answered);
    expect(screen.getByText('Quote received')).toBeInTheDocument();
    expect(screen.getByText('€4,600')).toBeInTheDocument();
    expect(screen.getByText(/Materials and labour included/)).toBeInTheDocument();
  });

  it('asks for confirmation before accepting, then tells the page to reload', async () => {
    vi.mocked(customerApi.decideQuote).mockResolvedValue({} as never);
    const onChanged = renderCard(answered);
    fireEvent.click(screen.getByRole('button', { name: 'Accept quote' }));
    expect(customerApi.decideQuote).not.toHaveBeenCalled();
    expect(screen.getByText(/Quick Fix Plumbing will be told and will contact you/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Yes, accept' }));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    expect(customerApi.decideQuote).toHaveBeenCalledWith('q1', 'accepted');
  });

  it('shows the business contact details after accepting, and no buttons any more', () => {
    renderCard({ ...answered, customerDecision: 'accepted', canDecide: false });
    expect(screen.getByText('You accepted')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /fix@example.com/ })).toHaveAttribute('href', 'mailto:fix@example.com');
    expect(screen.queryByRole('button', { name: 'Accept quote' })).not.toBeInTheDocument();
  });

  it('says it is waiting while the business has not answered', () => {
    renderCard({ ...answered, status: 'pending', quotedPriceCents: null, businessMessage: null, canDecide: false });
    expect(screen.getByText('Sent')).toBeInTheDocument();
    expect(screen.getByText('Waiting for Quick Fix Plumbing to answer.')).toBeInTheDocument();
  });
});
