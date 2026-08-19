import { useState, type FormEvent } from 'react';
import { useToast } from '../hooks/useToast';
import { track } from '../lib/monitoring';
import { fetchWithTimeout } from '../lib/rpc';

/** Read per-submit so tests can stub it with vi.stubEnv. */
const feedbackApi = () =>
  ((import.meta.env.VITE_FEEDBACK_API as string | undefined) ?? '').replace(/\/+$/, '');

interface FeedbackWidgetProps {
  walletAddress: string | null;
}

/**
 * Floating feedback collector: 1–5 stars + optional comment, posted to the
 * CrowdfundX backend (see backend/src/server.js). Requires a connected
 * wallet so every response is tied to a real Stellar address.
 */
export function FeedbackWidget({ walletAddress }: FeedbackWidgetProps) {
  const { push } = useToast();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!walletAddress) {
      push('error', 'Connect your wallet to leave feedback');
      return;
    }
    if (rating < 1) {
      push('error', 'Pick a star rating first');
      return;
    }
    const api = feedbackApi();
    if (!api) {
      push('error', 'Feedback API is not configured (VITE_FEEDBACK_API)');
      return;
    }
    setSending(true);
    try {
      const res = await fetchWithTimeout(`${api}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: walletAddress,
          rating,
          comment: comment.trim() || undefined,
          page: window.location.hash || '/',
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `Feedback failed (${res.status})`);
      }
      void track('feedback_submitted', { rating });
      push('success', 'Thanks — feedback recorded!');
      setRating(0);
      setComment('');
      setOpen(false);
    } catch (err) {
      push('error', err instanceof Error ? err.message : 'Could not submit feedback');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="feedback-widget" data-testid="feedback-widget">
      {open && (
        <form className="card feedback-panel" onSubmit={(e) => void submit(e)}>
          <h3>How was CrowdfundX?</h3>
          <div className="feedback-stars" role="radiogroup" aria-label="Rating">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                className={`feedback-star ${value <= rating ? 'feedback-star--on' : ''}`}
                onClick={() => setRating(value)}
                aria-label={`${value} star${value > 1 ? 's' : ''}`}
              >
                ★
              </button>
            ))}
          </div>
          <textarea
            className="input feedback-comment"
            placeholder="Anything we could do better? (optional)"
            maxLength={500}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
          />
          <div className="feedback-actions">
            <button
              type="button"
              className="button button--ghost button--small"
              onClick={() => setOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="button button--primary button--small" disabled={sending}>
              {sending ? 'Sending…' : 'Send feedback'}
            </button>
          </div>
        </form>
      )}
      <button
        type="button"
        className="button button--primary feedback-fab"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
      >
        {open ? '✕' : 'Feedback'}
      </button>
    </div>
  );
}
