import { describe, expect, it } from 'vitest';
import { aggregateActivity } from './leaderboard';
import type { DecodedEvent } from './types';

const contributed = (id: string, address: string, amount: bigint): DecodedEvent => ({
  id,
  ledger: 1,
  contractId: 'CAAA',
  name: 'contributed',
  data: { amount },
  topics: [address],
});

const created = (id: string): DecodedEvent => ({
  id,
  ledger: 1,
  contractId: 'CFAC',
  name: 'campaign_created',
  data: {},
  topics: [],
});

describe('aggregateActivity', () => {
  it('aggregates contributions per address and ranks by total', () => {
    const events = [
      contributed('e1', 'GAAA', 100n),
      contributed('e2', 'GBBB', 500n),
      contributed('e3', 'GAAA', 50n),
      created('e4'),
      created('e5'),
    ];
    const board = aggregateActivity(events);
    expect(board.campaignCount).toBe(2);
    expect(board.contributorCount).toBe(2);
    expect(board.totalContributed).toBe(650n);
    expect(board.rows[0]).toMatchObject({ address: 'GBBB', total: 500n, contributions: 1 });
    expect(board.rows[1]).toMatchObject({ address: 'GAAA', total: 150n, contributions: 2 });
  });

  it('ignores events without an amount or address', () => {
    const events: DecodedEvent[] = [
      { id: 'e1', ledger: 1, contractId: 'C', name: 'contributed', data: {}, topics: [] },
      contributed('e2', 'GAAA', 100n),
    ];
    const board = aggregateActivity(events);
    expect(board.rows).toHaveLength(1);
    expect(board.totalContributed).toBe(100n);
  });

  it('returns an empty board for no events', () => {
    const board = aggregateActivity([]);
    expect(board.rows).toHaveLength(0);
    expect(board.totalContributed).toBe(0n);
  });
});
