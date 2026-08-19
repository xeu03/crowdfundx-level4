import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { rmSync } from 'node:fs';

// Deterministic runs: wipe the test database before the server module loads
// it (imports are hoisted, so load the app dynamically afterwards).
rmSync('./data/test-feedback.db', { force: true });
const { app } = await import('../src/server.js');

let server;
let baseUrl;

beforeAll(async () => {
  server = app.listen(0);
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

afterAll(() => {
  server.close();
});

const VALID_ADDRESS = 'GBOKCW7UCWXFKOZFK2OQKE3NFRFID5BYWZZIKBGH257SZK2GT4HOFWFB';

describe('health', () => {
  it('reports ok with service name', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.service).toBe('crowdfundx-backend');
  });
});

describe('feedback API', () => {
  it('accepts a valid submission and returns its id', async () => {
    const res = await fetch(`${baseUrl}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: VALID_ADDRESS, rating: 5, comment: 'Great UX!' }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(typeof body.id).toBe('number');
  });

  it('rejects an invalid address', async () => {
    const res = await fetch(`${baseUrl}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: 'not-an-address', rating: 5 }),
    });
    expect(res.status).toBe(400);
  });

  it('rejects out-of-range ratings', async () => {
    const res = await fetch(`${baseUrl}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: VALID_ADDRESS, rating: 9 }),
    });
    expect(res.status).toBe(400);
  });

  it('aggregates submissions in the summary', async () => {
    for (const rating of [4, 5, 3]) {
      await fetch(`${baseUrl}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: VALID_ADDRESS, rating }),
      });
    }
    const res = await fetch(`${baseUrl}/api/feedback/summary`);
    expect(res.status).toBe(200);
    const summary = await res.json();
    // 4 submissions in this run: 5★ (first test) + 4★, 5★, 3★ (this test).
    expect(summary.total).toBe(4);
    expect(summary.averageRating).toBeGreaterThan(4);
    expect(summary.distribution).toEqual({ 3: 1, 4: 1, 5: 2 });
  });
});
