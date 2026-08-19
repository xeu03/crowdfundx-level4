import type { DecodedEvent } from './types';

export interface ContributorRow {
  address: string;
  total: bigint;
  contributions: number;
}

export interface Leaderboard {
  rows: ContributorRow[];
  contributorCount: number;
  totalContributed: bigint;
  campaignCount: number;
}

/**
 * Aggregate campaign events into a contributor leaderboard. On-chain proof of
 * user activity: every row comes straight from `campaign/contributed` and
 * `factory/campaign_created` events on testnet.
 */
export function aggregateActivity(events: DecodedEvent[]): Leaderboard {
  const byAddress = new Map<string, ContributorRow>();
  let campaignCount = 0;

  for (const event of events) {
    if (event.name === 'campaign_created') {
      campaignCount += 1;
      continue;
    }
    if (event.name !== 'contributed') continue;
    const address = typeof event.topics[0] === 'string' ? event.topics[0] : null;
    if (!address) continue;
    const amount =
      typeof event.data.amount === 'bigint'
        ? event.data.amount
        : typeof event.data.amount === 'string' || typeof event.data.amount === 'number'
          ? BigInt(event.data.amount)
          : 0n;
    if (amount <= 0n) continue;
    const row = byAddress.get(address) ?? { address, total: 0n, contributions: 0 };
    row.total += amount;
    row.contributions += 1;
    byAddress.set(address, row);
  }

  const rows = [...byAddress.values()].sort((a, b) =>
    b.total === a.total ? b.contributions - a.contributions : b.total > a.total ? 1 : -1,
  );
  const totalContributed = rows.reduce((sum, row) => sum + row.total, 0n);
  return {
    rows,
    contributorCount: rows.length,
    totalContributed,
    campaignCount,
  };
}
