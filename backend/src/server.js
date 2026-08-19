// CrowdfundX backend — feedback collection + health/monitoring endpoints.
//
//   POST /api/feedback            submit a rating + comment
//   GET  /api/feedback            latest feedback
//   GET  /api/feedback/summary    aggregates (total, avg, distribution, recent)
//   GET  /api/health              liveness probe for uptime monitoring
//   GET  /                        public feedback summary page (screenshot-friendly)
//
// Run:  npm start   (PORT env, default 4000)
import express from 'express';
import { insertFeedback, listFeedback, summarizeFeedback } from './db.js';
import { rateLimit } from './rateLimit.js';

const PORT = Number(process.env.PORT ?? 4000);
const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '10kb' }));

// CORS — the API is intentionally public (browser clients from any host).
app.use((req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

const ADDRESS_RE = /^G[A-Z0-9]{55}$/;

function validateFeedback(body) {
  const { address, rating, comment, page } = body ?? {};
  if (typeof address !== 'string' || !ADDRESS_RE.test(address)) {
    return 'address must be a Stellar public key (G…)';
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return 'rating must be an integer between 1 and 5';
  }
  if (comment !== undefined && (typeof comment !== 'string' || comment.length > 500)) {
    return 'comment must be a string of at most 500 characters';
  }
  if (page !== undefined && (typeof page !== 'string' || page.length > 100)) {
    return 'page must be a string of at most 100 characters';
  }
  return null;
}

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    uptimeSeconds: Math.round(process.uptime()),
    service: 'crowdfundx-backend',
  });
});

app.post('/api/feedback', rateLimit, (req, res) => {
  const error = validateFeedback(req.body);
  if (error) {
    res.status(400).json({ error });
    return;
  }
  const id = insertFeedback(req.body);
  res.status(201).json({ id });
});

app.get('/api/feedback', (req, res) => {
  const limit = Number(req.query.limit ?? 50);
  res.json(listFeedback(Number.isFinite(limit) ? limit : 50));
});

app.get('/api/feedback/summary', (_req, res) => {
  res.json(summarizeFeedback());
});

const PAGE = (summary) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>CrowdfundX — Feedback</title>
<style>
  body { font-family: system-ui, sans-serif; background:#0b0e14; color:#e8ecf4; max-width:720px; margin:0 auto; padding:2rem 1rem; }
  .tiles { display:flex; gap:1rem; flex-wrap:wrap; }
  .tile { background:#161b26; border:1px solid #232a38; border-radius:12px; padding:1rem 1.4rem; min-width:8rem; }
  .tile strong { display:block; font-size:1.5rem; color:#729dff; }
  .tile span { color:#97a1b3; font-size:.8rem; text-transform:uppercase; }
  li { background:#161b26; border:1px solid #232a38; border-radius:8px; padding:.6rem .8rem; margin-bottom:.5rem; list-style:none; }
  .addr { font-family:monospace; font-size:.85rem; color:#97a1b3; }
  .stars { color:#fbbf24; }
</style>
</head>
<body>
  <h1>CrowdfundX — user feedback</h1>
  <div class="tiles">
    <div class="tile"><strong>${summary.total}</strong><span>responses</span></div>
    <div class="tile"><strong>${summary.averageRating}</strong><span>avg rating / 5</span></div>
  </div>
  <h2>Recent</h2>
  <ul>
    ${summary.recent
      .map(
        (f) => `<li>
          <span class="stars">${'★'.repeat(f.rating)}${'☆'.repeat(5 - f.rating)}</span>
          ${f.comment ? `— ${f.comment.replace(/[<>&]/g, '')}` : ''}
          <div class="addr">${f.address.slice(0, 8)}… · ${f.created_at}</div>
        </li>`,
      )
      .join('')}
  </ul>
</body>
</html>`;

app.get('/', (_req, res) => {
  res.type('html').send(PAGE(summarizeFeedback()));
});

// Export the app for tests; start listening only when run directly.
export { app };

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  app.listen(PORT, () => {
    console.log(`CrowdfundX backend listening on :${PORT}`);
  });
}
