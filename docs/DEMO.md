# Demo Video Script (1–2 minutes) — Level 4

Record with OBS/Loom/screen recorder, 1080p, no audio required (or light
voiceover). Cover the arc below — it demonstrates the complete product
lifecycle end-to-end.

## Scene plan (~15s each)

1. **Product intro** (0:00–0:15)
   - Live demo URL, "CrowdfundX — all-or-nothing crowdfunding on Stellar"
   - Point at the header: network badge (Testnet · online), wallet button,
     Leaderboard link.

2. **Explore & live data** (0:15–0:30)
   - Campaign grid with Moonbase One (goal, deadline, milestones)
   - Platform stats tiles (campaigns, CFX raised)
   - Live event feed updating from the RPC stream.

3. **Wallet + contribute** (0:30–0:50)
   - Connect Freighter → show address in header
   - Open a campaign → contribute → wallet signs → success toast
   - The event feed shows the contribution instantly; progress bar moves.

4. **Creator flow** (0:50–1:10)
   - Create a campaign (name, goal, deadline, milestone builder with
     exact-sum validation) → factory deploys the contract
   - Release a milestone → vault pays the creator (event feed).

5. **Safety net** (1:10–1:25)
   - Show a campaign that expired below goal → close → refund claim
   - Tokens return to the backer's wallet.

6. **Proof & quality** (1:25–1:45)
   - Leaderboard page: real wallet addresses ranked by on-chain activity
   - Feedback widget: submit a rating
   - GitHub Actions CI green; Sentry/PostHog dashboards (if configured)
   - Backend health endpoint `GET /api/health`.

7. **Close** (1:45–1:55)
   - One-line pitch: "Anyone can fund anyone — verified on-chain."

## Before recording

- Fresh reload of the live demo (clear toasts/events)
- Have a second wallet ready (backer) so contributions aren't self-deals
- Have CFX minted to both wallets (`scripts/faucet.sh`)
- Camera-visible wallet interactions: signing popups prove real usage
