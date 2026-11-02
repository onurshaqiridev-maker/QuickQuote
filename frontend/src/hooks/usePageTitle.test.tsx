import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PageHeader } from '../components/ui/PageHeader';
import { usePageTitle } from './usePageTitle';

function Home() {
  usePageTitle();
  return null;
}

describe('usePageTitle', () => {
  it('names the page in the browser tab', () => {
    render(<PageHeader title="My quote requests" />);
    expect(document.title).toBe('My quote requests | Quotiva');
  });

  it('uses the site name alone on the home page', () => {
    render(<Home />);
    expect(document.title).toBe('Quotiva: find local businesses, request quotes and book');
  });
});
