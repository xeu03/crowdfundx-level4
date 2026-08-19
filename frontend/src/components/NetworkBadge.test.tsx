import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { NetworkBadge } from './NetworkBadge';
import { server } from '../lib/rpc';

vi.mock('../lib/rpc', () => ({
  server: { getHealth: vi.fn() },
}));

const mockGetHealth = vi.mocked(server.getHealth);

describe('NetworkBadge', () => {
  beforeEach(() => {
    mockGetHealth.mockReset();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('shows online when the RPC responds', async () => {
    mockGetHealth.mockResolvedValue({} as never);
    render(<NetworkBadge />);
    await waitFor(() => expect(screen.getByText(/online/)).toBeInTheDocument());
    expect(screen.getByTestId('network-badge')).toHaveClass('network-badge--online');
  });

  it('shows offline when the RPC is unreachable', async () => {
    mockGetHealth.mockRejectedValue(new Error('down'));
    render(<NetworkBadge />);
    await waitFor(() => expect(screen.getByText('RPC offline')).toBeInTheDocument());
    expect(screen.getByTestId('network-badge')).toHaveClass('network-badge--offline');
  });
});
