import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { customerApi } from '../../api/customer.api';
import { AuthContext } from '../../context/auth-context';
import { fakeAuth } from '../../test/fake-auth';
import type { PublicBusiness } from '../../types/api';
import { QuoteRequestPanel } from './QuoteRequestPanel';

vi.mock('../../api/customer.api', () => ({ customerApi: { requestQuote: vi.fn() } }));

const business = {
  id: 'b1',
  slug: 'bella',
  displayName: 'Bella Hair Studio',
  timezone: 'Europe/Berlin',
  services: [
    { id: 's1', name: "Women's haircut", description: null, priceType: 'fixed', priceCents: 4500, durationMinutes: 60, isBookable: true },
    { id: 's2', name: 'Bridal hair', description: null, priceType: 'on_request', priceCents: null, durationMinutes: null, isBookable: false },
  ],
} as unknown as PublicBusiness;

function renderPanel(serviceId: string | null) {
  render(
    <AuthContext.Provider value={fakeAuth('customer')}>
      <MemoryRouter>
        <QuoteRequestPanel business={business} serviceId={serviceId} onClose={() => undefined} />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

const type = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe('QuoteRequestPanel', () => {
  beforeEach(() => vi.mocked(customerApi.requestQuote).mockReset());

  it('starts with the service the customer clicked on', () => {
    renderPanel('s2');
    expect(screen.getByLabelText('What is it about?')).toHaveValue('s2');
  });

  it('checks the budget before sending', () => {
    renderPanel(null);
    type('Budget in EUR (optional)', 'about 200');
    fireEvent.click(screen.getByRole('button', { name: 'Send request' }));
    expect(screen.getByText('Enter an amount like 250 or 249.50.')).toBeInTheDocument();
    expect(customerApi.requestQuote).not.toHaveBeenCalled();
  });

  it('sends the request with the budget in cents and shows a confirmation', async () => {
    vi.mocked(customerApi.requestQuote).mockResolvedValue({} as never);
    renderPanel('s2');
    type('Subject', 'Bridal hair for my wedding');
    type('What do you need?', 'Long hair, an updo with flowers, and a trial session.');
    type('Budget in EUR (optional)', '249,50');
    fireEvent.click(screen.getByRole('button', { name: 'Send request' }));

    await waitFor(() => expect(screen.getByText('Request sent!')).toBeInTheDocument());
    expect(customerApi.requestQuote).toHaveBeenCalledWith({
      businessId: 'b1',
      serviceId: 's2',
      subject: 'Bridal hair for my wedding',
      description: 'Long hair, an updo with flowers, and a trial session.',
      preferredDate: '',
      budgetCents: 24950,
      phone: '',
    });
  });
});
