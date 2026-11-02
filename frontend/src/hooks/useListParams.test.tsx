import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router';
import { describe, expect, it } from 'vitest';
import { useListParams } from './useListParams';

function Probe() {
  const { get, page, update } = useListParams();
  const location = useLocation();
  return (
    <div>
      <p>address: {location.search}</p>
      <p>status: {get('status') || 'none'}, page: {page}</p>
      <button type="button" onClick={() => update({ status: 'suspended' })}>Filter</button>
      <button type="button" onClick={() => update({ page: '3' })}>Page 3</button>
      <button type="button" onClick={() => update({ status: undefined })}>Clear</button>
    </div>
  );
}

describe('useListParams', () => {
  it('reads filters from the address and goes back to page 1 when a filter changes', () => {
    render(<MemoryRouter initialEntries={['/admin/customers?search=sara&page=2']}><Probe /></MemoryRouter>);
    expect(screen.getByText('status: none, page: 2')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Filter'));
    expect(screen.getByText('address: ?search=sara&status=suspended')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Page 3'));
    expect(screen.getByText('status: suspended, page: 3')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Clear'));
    expect(screen.getByText('address: ?search=sara')).toBeInTheDocument();
  });
});
