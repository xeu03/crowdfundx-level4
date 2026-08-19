/**
 * Monitoring & analytics — both integrations are env-gated so the app runs
 * with zero configuration and degrades gracefully:
 *
 *   VITE_SENTRY_DSN     → error tracking via @sentry/react
 *   VITE_POSTHOG_KEY    → usage analytics via PostHog's REST capture API
 *   VITE_POSTHOG_HOST   → optional self-hosted PostHog endpoint
 */

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const POSTHOG_HOST =
  (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ?? 'https://us.i.posthog.com';
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;

let sessionId: string | null = null;

/** Stable per-visit id so analytics can count distinct sessions. */
function getSessionId(): string {
  if (!sessionId) {
    sessionId = `sess-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
  return sessionId;
}

/** Track a product event in PostHog. Silent no-op when not configured. */
export async function track(
  event: string,
  properties: Record<string, unknown> = {},
): Promise<void> {
  if (!POSTHOG_KEY) return;
  try {
    await fetch(`${POSTHOG_HOST}/capture/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: POSTHOG_KEY,
        event,
        distinct_id: getSessionId(),
        properties: { $current_url: window.location.href, ...properties },
      }),
    });
  } catch {
    // Analytics must never break the app.
  }
}

/** Initialise Sentry error monitoring. No-op without a DSN. */
export async function initSentry(): Promise<void> {
  if (!SENTRY_DSN) return;
  try {
    const { init, browserTracingIntegration } = await import('@sentry/react');
    init({
      dsn: SENTRY_DSN,
      integrations: [browserTracingIntegration()],
      tracesSampleRate: 0.2,
    });
  } catch {
    // Bundle/network failure of the optional integration is not fatal.
  }
}

/** Report a caught error to Sentry. No-op without a DSN. */
export async function reportError(error: unknown, context?: string): Promise<void> {
  if (!SENTRY_DSN) return;
  try {
    const { captureException } = await import('@sentry/react');
    captureException(error, { tags: { context: context ?? 'unknown' } });
  } catch {
    // ignore
  }
}
