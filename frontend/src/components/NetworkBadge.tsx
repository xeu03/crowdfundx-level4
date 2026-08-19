import { useEffect, useState } from 'react';
import { server } from '../lib/rpc';

export type RpcHealth = 'checking' | 'online' | 'offline';

const HEALTH_POLL_MS = 30_000;

/**
 * Live RPC health indicator: polls `getHealth` and shows the network state
 * in the header. Also the app's first line of "monitoring".
 */
export function NetworkBadge() {
  const [health, setHealth] = useState<RpcHealth>('checking');

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        await server.getHealth();
        if (!cancelled) setHealth('online');
      } catch {
        if (!cancelled) setHealth('offline');
      }
    };
    void check();
    const timer = setInterval(check, HEALTH_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const label =
    health === 'online' ? 'Testnet · online' : health === 'offline' ? 'RPC offline' : '…';

  return (
    <span
      className={`network-badge network-badge--${health}`}
      title="Soroban RPC health"
      data-testid="network-badge"
    >
      <span className="network-badge__dot" aria-hidden="true" />
      {label}
    </span>
  );
}
