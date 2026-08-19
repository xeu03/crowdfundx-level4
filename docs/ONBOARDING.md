# User Onboarding Runbook — Level 4 (10+ real users)

The Level 4 requirement asks for **10+ real users** with **proof of wallet
interactions** and a **feedback summary**. Everything below is tooling that
already exists in this repo — the only human part is recruiting people.

## 1. Prepare the user pool

- Recruit from: developer friends, Telegram/Discord Stellar communities,
  university groups. 10 users is the bar; aim for 15–20 to be safe.
- Every user needs:
  1. The [Freighter extension](https://www.freighter.app/) installed
  2. A testnet account (Freighter can auto-create + friendbot-fund one)
  3. Some CFX to contribute with

## 2. Fund users

The deployer (token admin) mints CFX per user:

```bash
scripts/faucet.sh GDKW… GABC… GXYZ…        # 50 CFX each
```

The mint transaction itself is an on-chain record: every funded address has a
`token/mint` event attributed to it.

## 3. Ask each user to (in ~5 minutes)

1. Open the live demo → **Connect Wallet** (Freighter)
2. Browse campaigns → open one → **Contribute** any amount
3. (Optional) create their own campaign or claim a refund
4. Leave a **rating + comment** via the Feedback button
5. Check their spot on the **Leaderboard** page

## 4. Collect proof of wallet interactions

All proof comes from the ledger — no screenshots needed:

- **Leaderboard page** (`/#/leaderboard`): every contributor address, ranked
  by verified on-chain totals. Screenshot this for the submission.
- **stellar.expert**: each contribution transaction is public on testnet
  (e.g. the demo contribution `99e010fe…37ac9`).
- **Factory events**: `contribution_tracked` events aggregate platform-wide.
- The token contract's `mint` events show every onboarded address.

Count contributors with the RPC:

```bash
stellar events --start-ledger 1 \
  --topic campaign contributed --network testnet 2>/dev/null |
  grep -oE 'G[A-Z0-9]{55}' | sort -u | wc -l
```

## 5. Feedback summary

- Users submit feedback through the in-app widget → stored in the backend's
  SQLite database.
- Public summary page: `<backend-url>/` (shows total responses, average
  rating, recent comments).
- For the submission: screenshot the summary page and note the totals in the
  README (e.g. "14 responses, 4.6/5 average — main asks: faster payouts,
  more campaigns").

## 6. Common blockers

| Problem | Fix |
| --- | --- |
| User has no CFX | `scripts/faucet.sh <address>` |
| Freighter shows wrong network | Switch to Testnet in Freighter settings |
| Transaction fails "insufficient balance" | Fund again; fee is 10 CFX for creators, nothing for backers |
| Contribution rejected (overfunding) | Campaign goal is capped — pick an amount ≤ remaining |
| Feedback button errors | Set `VITE_FEEDBACK_API` and redeploy the frontend |
