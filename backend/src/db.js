// SQLite persistence via Node's built-in `node:sqlite` (no native deps).
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const DB_PATH = process.env.DB_PATH ?? resolve(process.cwd(), 'data', 'feedback.db');
mkdirSync(dirname(DB_PATH), { recursive: true });

export const db = new DatabaseSync(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS feedback (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    address    TEXT    NOT NULL,
    rating     INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment    TEXT,
    page       TEXT,
    created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
  )
`);

const insertStmt = db.prepare(
  'INSERT INTO feedback (address, rating, comment, page) VALUES (?, ?, ?, ?)',
);
const listStmt = db.prepare(
  'SELECT id, address, rating, comment, page, created_at FROM feedback ORDER BY id DESC LIMIT ?',
);
const countStmt = db.prepare('SELECT COUNT(*) AS n FROM feedback');
const avgStmt = db.prepare('SELECT AVG(rating) AS avg FROM feedback');
const distStmt = db.prepare(
  'SELECT rating, COUNT(*) AS n FROM feedback GROUP BY rating ORDER BY rating',
);

export function insertFeedback({ address, rating, comment, page }) {
  const { lastInsertRowid } = insertStmt.run(address, rating, comment ?? null, page ?? null);
  return Number(lastInsertRowid);
}

export function listFeedback(limit = 50) {
  return listStmt.all(Math.min(100, Math.max(1, limit)));
}

export function summarizeFeedback() {
  const total = Number(countStmt.get().n);
  const avg = Number(avgStmt.get().avg ?? 0);
  const distribution = Object.fromEntries(
    distStmt.all().map((row) => [row.rating, Number(row.n)]),
  );
  return {
    total,
    averageRating: Math.round(avg * 100) / 100,
    distribution,
    recent: listFeedback(10),
  };
}
