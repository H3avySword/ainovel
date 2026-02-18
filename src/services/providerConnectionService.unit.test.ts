import {
  connectProvider,
  getAllProviderStatuses,
  getProviderStatus,
  testProvider,
  type ProviderId
} from '@/services/providerConnectionService';
import type { AppConfig } from '@/types';
import { describe, expect, it, vi } from 'vitest';

const readyConfig: AppConfig = {
  isReady: true,
  port: 8123,
  token: 'test-token'
};

const asJson = (payload: unknown, status = 200) => {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
};

describe('providerConnectionService', () => {
  it('throws when backend is not ready', async () => {
    await expect(getProviderStatus(null, 'google')).rejects.toThrow('Backend is not ready');
  });

  it('sends auth header when requesting provider status', async () => {
    const fetchMock = vi.fn().mockResolvedValue(asJson({ provider: 'google', ok: true }));
    vi.stubGlobal('fetch', fetchMock);

    await getProviderStatus(readyConfig, 'google');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://127.0.0.1:8123/api/providers/google/status');
    expect(options.method).toBe('GET');
    expect((options.headers as Record<string, string>).Authorization).toBe('test-token');
  });

  it('filters unknown providers from config map payload', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      asJson({
        providers: {
          google: { configured: true, masked: '***' },
          unknown: { configured: true, masked: '***' }
        }
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await getAllProviderStatuses(readyConfig);

    expect(result.providers.google?.configured).toBe(true);
    expect((result.providers as Record<string, unknown>).unknown).toBeUndefined();
  });

  it('maps connect payload to backend schema', async () => {
    const fetchMock = vi.fn().mockResolvedValue(asJson({ provider: 'google', ok: true }));
    vi.stubGlobal('fetch', fetchMock);

    await connectProvider(readyConfig, 'google', {
      apiKey: '  key-1  ',
      apiBaseUrl: ' https://example.com/v1 ',
      verify: false
    });

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(options.body));
    expect(body).toEqual({
      api_key: 'key-1',
      api_base_url: 'https://example.com/v1',
      verify: false
    });
  });

  it('returns backend detail on non-200 responses', async () => {
    const fetchMock = vi.fn().mockResolvedValue(asJson({ detail: 'bad request from backend' }, 400));
    vi.stubGlobal('fetch', fetchMock);

    await expect(testProvider(readyConfig, 'google' satisfies ProviderId)).rejects.toThrow('bad request from backend');
  });
});
