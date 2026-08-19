import { afterEach, describe, expect, it, vi } from 'vitest';
import { track } from './monitoring';

describe('track', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('is a silent no-op when analytics is not configured', async () => {
    // In the test environment VITE_POSTHOG_KEY is unset — track must neither
    // throw nor perform any network call.
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    await expect(track('contribute', { campaign: 'CAAA' })).resolves.toBeUndefined();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
