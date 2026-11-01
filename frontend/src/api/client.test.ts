import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiRequest } from './client';

function mockFetch(status: number, body: unknown) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status })));
}

afterEach(() => vi.unstubAllGlobals());

describe('apiRequest', () => {
  it('returns the JSON body and sends the login cookie', async () => {
    mockFetch(200, { data: { ok: true } });
    await expect(apiRequest('GET', '/api/test')).resolves.toEqual({ data: { ok: true } });
    expect(vi.mocked(fetch).mock.calls[0][1]).toMatchObject({ credentials: 'include' });
  });

  it('turns an error response into an ApiError with field errors', async () => {
    mockFetch(400, {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Some fields are not valid.',
        details: [
          { field: 'email', message: 'Please enter a valid email address.' },
          { field: 'password', message: 'Too short.' },
          { field: 'password', message: 'Needs a number.' },
        ],
      },
    });
    const error = await apiRequest('POST', '/api/test', {}).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe('VALIDATION_ERROR');
    expect((error as ApiError).fieldErrors()).toEqual({
      email: 'Please enter a valid email address.',
      password: 'Too short.', // the first message per field
    });
  });

  it('reports a friendly message when the server cannot be reached', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(apiRequest('GET', '/api/test')).rejects.toMatchObject({ code: 'NETWORK_ERROR', status: 0 });
  });
});
