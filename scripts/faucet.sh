#!/usr/bin/env bash
# ============================================================================
# CrowdfundX faucet — mint CFX to a new user so they can try the platform.
#
# Usage:
#   scripts/faucet.sh GDKW...            # mint to one address
#   scripts/faucet.sh GDKW... GABC...    # mint to several addresses
#   AMOUNT=50 scripts/faucet.sh GDKW...  # custom amount (default 50 CFX)
#
# Requires the token admin identity (created by scripts/deploy.sh) in the
# Stellar CLI config. Reads the token address from deployment.json.
# ============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NETWORK="${NETWORK:-testnet}"
DEPLOYER="${DEPLOYER:-deployer}"
AMOUNT_RAW="${AMOUNT_RAW:-500000000}"   # 50 CFX (7 decimals)

[ "$#" -ge 1 ] || { echo "usage: faucet.sh <G-address> [<G-address>…]" >&2; exit 1; }

TOKEN_ID="$(python3 -c "import json; print(json.load(open('$ROOT/deployment.json'))['token'])")"
[ -n "$TOKEN_ID" ] || { echo "deployment.json not found — run scripts/deploy.sh first" >&2; exit 1; }

for addr in "$@"; do
  printf 'Minting %s CFX to %s … ' "$((AMOUNT_RAW / 10000000))" "$addr"
  TX_OUT="$(stellar contract invoke \
    --id "$TOKEN_ID" --source-account "$DEPLOYER" --network "$NETWORK" \
    -- mint --to "$addr" --amount "$AMOUNT_RAW" 2>&1)"
  TX="$(printf '%s\n' "$TX_OUT" | grep -oE '[0-9a-f]{64}' | head -1 || true)"
  if [ -n "$TX" ]; then
    echo "done (tx $TX)"
  else
    printf '\n%s\n' "$TX_OUT" | tail -3
    exit 1
  fi
done
