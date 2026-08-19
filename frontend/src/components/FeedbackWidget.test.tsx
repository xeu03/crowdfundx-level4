import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FeedbackWidget } from './FeedbackWidget';
import { ToastProvider } from '../hooks/useToast';

const ADDRESS = 'GBOKCW7UCWXFKOZFK2OQKE3NFRFID5BYWZZIKBGH257SZK2GT4HOFWFB';

function renderWidget(connected: boolean) {
  return render(
    <ToastProvider>
      <FeedbackWidget walletAddress={connected ? ADDRESS : null} />
    </ToastProvider>,
  );
}

describe('FeedbackWidget', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_FEEDBACK_API', 'http://test-api');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('opens the panel and prompts unconnected users to connect', async () => {
    const user = userEvent.setup();
    renderWidget(false);
    await user.click(screen.getByText('Feedback'));
    await user.click(screen.getByText('Send feedback'));
    expect(await screen.findByText('Connect your wallet to leave feedback')).toBeInTheDocument();
  });

  it('requires a rating before submitting', async () => {
    const user = userEvent.setup();
    renderWidget(true);
    await user.click(screen.getByText('Feedback'));
    await user.click(screen.getByText('Send feedback'));
    expect(await screen.findByText('Pick a star rating first')).toBeInTheDocument();
  });

  it('submits a rated comment to the backend', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ id: 1 }), { status: 201 }),
    );
    const user = userEvent.setup();
    renderWidget(true);
    await user.click(screen.getByText('Feedback'));
    await user.click(screen.getByLabelText('4 stars'));
    await user.click(screen.getByText('Send feedback'));

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/feedback');
    const body = JSON.parse(String(init.body));
    expect(body.address).toBe(ADDRESS);
    expect(body.rating).toBe(4);
    expect(await screen.findByText('Thanks — feedback recorded!')).toBeInTheDocument();
    fetchSpy.mockRestore();
  });
});
