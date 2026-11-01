import { describe, expect, it } from 'vitest';
import { slugify } from '../../src/services/auth.service';

describe('slugify', () => {
  it('makes URL-friendly names', () => {
    expect(slugify('Bella Hair Studio!')).toBe('bella-hair-studio');
    expect(slugify('  Café Zürich  ')).toBe('cafe-zurich');
  });

  it('falls back when nothing usable is left', () => {
    expect(slugify('!!!')).toBe('business');
  });
});
