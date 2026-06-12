import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';

vi.mock('../../../lib/github', () => ({
  getFullDashboardData: vi.fn(),
}));

vi.mock('next/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/server')>();
  return {
    ...actual,
    after: (fn: () => unknown) => {
      void fn();
    },
  };
});

import { getFullDashboardData } from '../../../lib/github';
import { quotaMonitor } from '@/services/github/quota-monitor';
import { refreshPolicy } from '@/services/github/refresh-policy';
import { refreshRateLimiter } from '@/services/github/refresh-rate-limiter';
import { backgroundRefresh } from '@/services/github/background-refresh';

function makeRequest(
  params: Record<string, string> = {},
  headers: Record<string, string> = {}
): Request {
  const url = new URL('http://localhost/api/github');

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  return new Request(url.toString(), {
    headers: new Headers(headers),
  });
}

describe('GET /api/github Theme Contrast', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(getFullDashboardData).mockResolvedValue({
      profile: { lastSyncedAt: new Date().toISOString() },
      calendar: {},
      lastSyncedAt: new Date().toISOString(),
    } as unknown as Awaited<ReturnType<typeof getFullDashboardData>>);

    quotaMonitor.reset();
    refreshPolicy.reset();
    refreshRateLimiter.reset();
    backgroundRefresh.reset();
  });

  it('returns Cached status for normal requests', async () => {
    const response = await GET(makeRequest({ username: 'torvalds' }));

    expect(response.status).toBe(200);
    expect(response.headers.get('X-Refresh-Status')).toBe('Cached');
    expect(response.headers.get('X-Cache-Status')).toBe('HIT');
  });

  it('returns Fresh status for refresh requests', async () => {
    const response = await GET(makeRequest({ username: 'torvalds', refresh: 'true' }));

    expect(response.status).toBe(200);
    expect(response.headers.get('X-Refresh-Status')).toBe('Fresh');
    expect(response.headers.get('X-Cache-Status')).toBe('MISS');
  });

  it('returns cooldown cached status for repeated refresh requests', async () => {
    await GET(makeRequest({ username: 'torvalds', refresh: 'true' }));

    const response = await GET(makeRequest({ username: 'torvalds', refresh: 'true' }));

    expect(response.status).toBe(200);
    expect(response.headers.get('X-Refresh-Status')).toBe('Cooldown-Served-Cached');
  });

  it('returns 429 when quota is low during refresh', async () => {
    quotaMonitor.setQuota(5000, 400, Date.now() + 60000);

    const response = await GET(makeRequest({ username: 'torvalds', refresh: 'true' }));

    expect(response.status).toBe(429);
  });

  it('returns cache-control headers appropriate to request mode', async () => {
    const cachedResponse = await GET(makeRequest({ username: 'torvalds' }));

    expect(cachedResponse.headers.get('Cache-Control')).toContain('stale-while-revalidate');

    const freshResponse = await GET(makeRequest({ username: 'octocat', refresh: 'true' }));

    expect(freshResponse.headers.get('Cache-Control')).toContain('no-cache');
  });
});
