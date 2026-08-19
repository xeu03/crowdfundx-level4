import { useCallback, useEffect, useMemo, useState } from 'react';
import { ErrorState } from '../components/ErrorState';
import { Skeleton } from '../components/Skeleton';
import { useEventStream } from '../hooks/useEventStream';
import { fetchCampaigns } from '../lib/contracts';
import { aggregateActivity } from '../lib/leaderboard';
import { formatCFX, shortAddress } from '../lib/format';
import { FACTORY_ADDRESS, isConfigured } from '../config';
import type { DecodedEvent } from '../lib/types';

/**
 * On-chain proof of user activity: streams every `contributed` and
 * `campaign_created` event from the testnet contracts and ranks wallets by
 * their verified on-chain actions. No database involved — the ledger IS the
 * data source.
 */
export function Leaderboard() {
  const [events, setEvents] = useState<DecodedEvent[]>([]);
  const [campaignIds, setCampaignIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isConfigured) {
      setLoading(false);
      return;
    }
    fetchCampaigns()
      .then((campaigns) => setCampaignIds(campaigns.map((c) => c.address)))
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Could not load campaigns'),
      )
      .finally(() => setLoading(false));
  }, []);

  const onEvent = useCallback((event: DecodedEvent) => {
    if (event.name === 'contributed' || event.name === 'campaign_created') {
      setEvents((current) => {
        if (current.some((e) => e.id === event.id)) return current;
        return [...current, event];
      });
    }
  }, []);

  // NOTE: no topic filters — the testnet RPC rejects string topics in
  // getEvents. All events for these contracts are streamed and filtered by
  // event name client-side (see onEvent).
  useEventStream({
    contractIds: isConfigured && campaignIds.length > 0 ? campaignIds : [],
    onEvent,
    enabled: isConfigured && campaignIds.length > 0,
  });
  useEventStream({
    contractIds: isConfigured ? [FACTORY_ADDRESS] : [],
    onEvent,
    enabled: isConfigured,
  });

  const board = useMemo(() => aggregateActivity(events), [events]);

  if (!isConfigured) {
    return (
      <div className="container">
        <ErrorState
          title="Not connected to a deployment yet"
          message="Set VITE_FACTORY_ADDRESS / VITE_TOKEN_ADDRESS in frontend/.env.local."
        />
      </div>
    );
  }

  return (
    <div className="container leaderboard-page">
      <h1>Leaderboard</h1>
      <p className="detail-hint">
        Every entry is verified on-chain — pulled straight from the
        <code> contributed</code> events of the testnet contracts.
      </p>

      <div className="hero__stats leaderboard-stats">
        <div className="stat-tile" data-testid="lb-contributors">
          <strong>{board.contributorCount}</strong>
          <span>backers</span>
        </div>
        <div className="stat-tile">
          <strong>{formatCFX(board.totalContributed)}</strong>
          <span>CFX contributed</span>
        </div>
        <div className="stat-tile">
          <strong>{board.campaignCount}</strong>
          <span>campaigns</span>
        </div>
      </div>

      {loading ? (
        <Skeleton variant="card" height="14rem" />
      ) : error ? (
        <ErrorState message={error} />
      ) : board.rows.length === 0 ? (
        <div className="empty-state">
          <p>No on-chain activity yet — be the first backer!</p>
        </div>
      ) : (
        <div className="card leaderboard-table-wrap">
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Wallet</th>
                <th>Contributions</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {board.rows.map((row, index) => (
                <tr key={row.address} data-testid="leaderboard-row">
                  <td>{index + 1}</td>
                  <td>
                    <span className="leaderboard-address" title={row.address}>
                      {shortAddress(row.address)}
                    </span>
                  </td>
                  <td>{row.contributions}</td>
                  <td>{formatCFX(row.total)} CFX</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
