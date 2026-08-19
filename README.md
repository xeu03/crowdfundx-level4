# CrowdfundX — Decentralized Crowdfunding on Stellar Soroban

> **Level 4 — Green Belt Submission** (built on the Level 3 Orange Belt base)
> A production-ready, end-to-end Stellar dApp: three Soroban smart contracts with
> inter-contract communication, live event streaming, a React frontend,
> full test suites, CI/CD pipelines — plus user onboarding, on-chain
> leaderboards, feedback collection, analytics and error monitoring.

<!-- ═══════════════════ Submission checklist ═══════════════════ -->

| Checklist item | Link |
| --- | --- |
| Public GitHub repository | https://github.com/xeu03/crowdfundx-level4 |
| Live demo (Vercel/Netlify) | https://crowdfundx-level4.netlify.app/ |
| Contract deployment address (factory) | [`CB46HW3YW5XVMBQLHOSKTLQ5SQBPDPIUDPG2U6JOCDGMHLBNLI5PHJO7`](https://stellar.expert/explorer/testnet/contract/CB46HW3YW5XVMBQLHOSKTLQ5SQBPDPIUDPG2U6JOCDGMHLBNLI5PHJO7) |
| Transaction hash (contract interaction) | [`99e010fe3dc8f34f1f8da37a48d192afd8c79da64a5206c0e285915c34537ac9`](https://stellar.expert/explorer/testnet/tx/99e010fe3dc8f34f1f8da37a48d192afd8c79da64a5206c0e285915c34537ac9) (contribution hitting the goal) |
| Proof of 10+ user wallet interactions | [Leaderboard](https://crowdfundx-level4.netlify.app/#/leaderboard) — 11 wallets ranked from 21 on-chain contribution events |
| User feedback summary | [Public summary page](https://crowdfundx-level4.onrender.com/) (backend API on Render) |

## Level 4 additions (on top of the Level 3 base)

| Requirement | Where |
| --- | --- |
| User onboarding (10+ users, proof of wallet interactions) | On-chain [Leaderboard](#leaderboard) aggregates every real wallet's activity from contract events; [`docs/ONBOARDING.md`](docs/ONBOARDING.md) runbook; `scripts/faucet.sh` funds new users |
| User feedback collection | In-app Feedback widget → [`backend/`](backend) API (Express + SQLite, rate-limited) with public summary page |
| Monitoring & analytics | Sentry error tracking + PostHog analytics (env-gated, `src/lib/monitoring.ts`), RPC health badge, backend `/api/health` |
| Performance optimization | Route-level code splitting (entry bundle ~7 kB gzip) + vendor chunk splitting |
| Production deployment | Frontend on Netlify, backend deployable to Render/Railway, contracts on testnet |

## Screenshots

![CrowdfundX home](docs/screenshots/home.png)

![Campaigns](docs/screenshots/campaigns.png)

![Leaderboard](docs/screenshots/leaderboard.png)

![Feedback summary](docs/screenshots/feedback.png)

<!-- ════════════════════════════════════════════════════════════════════════════════════ -->

## What it does

CrowdfundX is an **all-or-nothing crowdfunding platform**:

1. A creator deploys a campaign through the on-chain **factory** — the factory
   deploys a fresh **campaign contract** with a goal, deadline and milestone
   payout schedule, and charges a creation fee in the platform token.
2. Backers contribute **CFX** (the platform token) — tokens are pulled straight
   into the campaign vault.
3. If the goal is met by the deadline, the creator releases **milestones** one
   by one; each release pays out of the vault.
4. If the deadline passes below goal, anyone can flag the campaign and every
   backer claims a **full refund** from the vault.
5. Every action emits **Soroban events** that the frontend streams live via the
   RPC `getEvents` endpoint — new campaigns, contributions, payouts and refunds
   appear in the UI within seconds, no page refresh.

## Architecture

```mermaid
flowchart LR
  W[Wallet / Freighter] --> FE[React frontend]
  FE -->|simulate / submit| RPC[Soroban RPC]
  RPC --> F[Factory contract]
  F -->|deploy_v2| C1[Campaign #1]
  F --> C2[Campaign #2]
  C1 -->|transfer CFX| T[CFX Token]
  C2 -->|transfer CFX| T
  C1 -->|record_contribution| F
  C2 -->|record_contribution| F
  RPC -->|getEvents stream| FE
```

```
contracts/            Soroban smart contracts (Rust, workspace)
  token/              CFX — SEP-41 style token (mint/burn/transfer/allowance)
  campaign/           All-or-nothing campaign (milestones, refunds, vault)
  factory/            Platform factory (inter-contract deploy, stats, fee)
frontend/             React 19 + TypeScript + Vite dApp
backend/              Feedback API (Express + SQLite) + health endpoint
scripts/deploy.sh     One-command testnet/mainnet deployment + demo
scripts/faucet.sh     Mint CFX to onboard new users
.github/workflows/    CI (tests+build) and CD (deploy contracts + Netlify)
docs/                 Architecture, deployment, onboarding, demo script
```

## Leaderboard

`/#/leaderboard` aggregates every `contributed` and `campaign_created` event
straight from the testnet contracts and ranks wallets by their verified
on-chain activity — the proof-of-users page for Level 4. No database is
involved: the ledger itself is the source of truth.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for contract-level details and
[`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for the full deployment runbook.

## Frontend integration

The React dApp (`frontend/`) is wired to the deployed contracts on testnet via
`@stellar/stellar-sdk` and Freighter — full evidence and code excerpts in
[`FRONTEND.md`](FRONTEND.md).

- **Wallet**: `frontend/src/lib/wallet.ts` — Freighter
  `isConnected` → `requestAccess` → `getAddress` + `isAllowed`/`setAllowed`;
  `useWallet.ts` manages connect/disconnect state.
- **Transactions**: `frontend/src/lib/contracts.ts` — every action runs
  `TransactionBuilder` → `prepareTransaction` → Freighter `signTransaction` →
  `sendTransaction` → poll, with `nativeToScVal`/`scValToNative` conversions.
- **Contract calls per screen** (arg order matches the Rust contracts):

| UI action | Contract call |
| --- | --- |
| Explore grid / stats | factory `get_campaigns`, `get_stats` |
| Campaign page | campaign `get_state`, `get_contribution` |
| Back a campaign | campaign `contribute(from, amount)` |
| Release milestone | campaign `release_milestone(index)` |
| Claim refund | campaign `refund(contributor)` |
| Close failed campaign | campaign `close_failed()` |
| Extend deadline | campaign `extend_deadline(new_deadline)` |
| Launch campaign | factory `create_campaign(creator, name, token, goal, deadline, milestones)` |

- **Live updates**: `useEventStream.ts` streams `getEvents` with cursor
  pagination into the UI.

## Requirements coverage

| Requirement | Where |
| --- | --- |
| Advanced smart contract development | 3 contracts: SEP-41 token, stateful campaign (milestones, refunds, TTL bumping), deployer factory |
| Inter-contract communication | factory `deploy_v2`s campaigns; campaigns pull/push CFX via token; invoker-authorized `record_contribution` callback |
| Event streaming & real-time updates | `#[contractevent]` events on every action; `useEventStream` cursor-paginated polling, auto-reconnect |
| CI/CD pipeline | [`.github/workflows/ci.yml`](.github/workflows/ci.yml) + [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) |
| Deployment workflow | [`scripts/deploy.sh`](scripts/deploy.sh) + GitHub Actions deploy job |
| Error handling & loading states | ErrorBoundary, toast system, skeleton loaders, per-action busy states, RPC retries |
| Tests for contracts & frontend | 24 Rust integration tests (`cargo test`) + 24 Vitest tests (`npm test`) |
| Production-ready architecture | Typed RPC layer, env-driven config, deterministic deployments, storage TTL management, defensive auth |
| Documentation & demo | This README + docs/ + deploy script demo mode |

## Quickstart

### 1. Contracts — build & test

```bash
rustup target add wasm32v1-none          # SDK 27 requires wasm32v1-none
cd contracts
make check                               # build wasm + 24 tests
```

### 2. Deploy to testnet (needs [Stellar CLI](https://developers.stellar.org/docs/tools/cli))

```bash
scripts/deploy.sh                        # generates a funded testnet key + demo
# or with your own funded key:
DEPLOYER_SECRET=S… scripts/deploy.sh
```

This deploys the token + factory, uploads the campaign wasm, runs a demo
interaction (mint → create campaign → contribute), and writes:

- `deployment.json` — all addresses + transaction hashes
- `frontend/.env.local` — lets the frontend run immediately

### 3. Frontend

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173 (after deploy.sh)
npm test             # 24 tests
npm run build        # production bundle
```

Connect [Freighter](https://www.freighter.app/) (testnet) and fund the account
via the Freighter faucet to contribute.

## Testing

### Contracts — 24 tests

```
cargo test
```

- **token (8)**: mint/transfer/balance, allowance + transfer_from, expiry,
  burn, events, auth failures (precise `MockAuth` trees)
- **campaign (10)**: contribution flow + events, goal reached → milestone
  releases → vault payout, failed campaign → close → refunds, overfunding /
  deadline / milestone-sum guards, best-effort factory notification
- **factory (6)**: end-to-end factory→campaign→token round trip, creation fee,
  registry + invoker-auth rejection, campaign ordering, invalid milestone sum

### Frontend — 24 tests

```
cd frontend && npm test
```

- `format` utils (CFX parse/format, time helpers, progress clamping)
- `ProgressBar` (a11y, clamping, tones)
- `CampaignCard` (registry rendering, detail links)
- `EventFeed` (human-readable event descriptions, empty state)
- `useEventStream` (cursor pagination, unmount cleanup, error recovery)

## CI/CD

**CI** runs on every push/PR:

- contracts: builds wasm32v1-none, runs `cargo test`
- frontend: `npm ci`, type-check, 24 tests, production build

**Deploy** (workflow_dispatch):

- imports the deployer key from GitHub secrets, runs `scripts/deploy.sh` on
  testnet or mainnet, publishes all addresses + tx hashes to the run summary
- builds the frontend against the fresh contract addresses and publishes to
  Netlify

Secrets: `DEPLOYER_SECRET`, `NETLIFY_AUTH_TOKEN`, `NETLIFY_SITE_ID`.

## License

MIT
