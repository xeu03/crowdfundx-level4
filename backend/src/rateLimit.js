// Minimal in-memory per-IP rate limiter (no external deps).
const buckets = new Map();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 10;

/** Express middleware: 429 after MAX_PER_WINDOW requests per minute per IP. */
export function rateLimit(req, res, next) {
  const ip = req.ip ?? req.socket?.remoteAddress ?? 'unknown';
  const now = Date.now();
  const bucket = buckets.get(ip);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return next();
  }
  bucket.count += 1;
  if (bucket.count > MAX_PER_WINDOW) {
    res.status(429).json({ error: 'Too many requests, try again in a minute' });
    return;
  }
  next();
}

// Keep the map bounded: clear entries older than 2 windows.
const CLEANUP_MS = 2 * WINDOW_MS;
const cleanup = setInterval(() => {
  const now = Date.now();
  for (const [ip, bucket] of buckets) {
    if (bucket.resetAt + WINDOW_MS < now) buckets.delete(ip);
  }
}, CLEANUP_MS);
cleanup.unref?.();
