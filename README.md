# Plot Twist

**Every gift deserves a plot twist.**

Describe a gift in one sentence. SERV designs it — who it's for, the occasion, the amount and a personal note. You pay from your Kite Passport with a passkey, and the recipient unwraps it from a single link and claims it to their own wallet.

Built for SERV Hackathon Edition 02 · Kite track.

## How it works

1. **Design** — SERV Reasoning turns one sentence into a gift: recipient, occasion, amount, network (if you name one) and a note. Everything stays editable.
2. **Pay with Kite** — Plot Twist acts as the sender's agent: sign in with an email code, then approve one exact transfer (gift + fee) with your passkey on Kite Passport. Not enough on that network? Top up your Kite wallet from MetaMask / Phantom, with a card, or from an exchange.
3. **Seal** — the transfer is verified on-chain and the gift gets a link and a QR code. The preview never shows the amount.
4. **Unwrap and claim** — the recipient reveals the gift, can ask SERV what it is, then signs a message with their wallet. The platform sends the stablecoin and pays the gas.
5. **Claim window** — the sender picks 24h / 3d / 7d / 30d. After it, the sender can take an unclaimed gift back from the Dashboard (the fee isn't refunded); until then the recipient can still claim.

Gifts are digital dollars on the seven networks Kite Passport holds: USDC on Base, Solana, Polygon, Avalanche, Arc and Tempo, and USDG on Robinhood Chain. One gift lives on one network: you pay and they receive on the same network.

## Stack

- Next.js 16 (App Router) + TypeScript
- **SERV Reasoning** (OpenAI-compatible API, `serv-mini`) — gift design, note rewrites, recipient Q&A
- **Kite Passport** HTTP API — sign-in / sign-up, balances, passkey-approved wallet transfers
- viem (EVM) and @solana/web3.js (Solana) — on-chain verification, payouts, top-ups
- JSON file store in `data/` (swap for a database before running at scale)

## Run it

```bash
npm install
cp .env.example .env.local      # add SERV_API_KEY
npm run wallet:new              # creates SESSION_SECRET + platform EVM / Solana hot wallets in .env.local
npm run dev
```

Fund the platform wallets with a little gas on the networks you use (e.g. ETH on Base); gift payments land there and payouts come from there.

## Project layout

- `src/app` — pages (`/`, `/create`, `/dashboard`, `/g/[code]`) and API routes (`/api/kite/*`, `/api/gifts/*`, `/api/account/*`, `/api/design*`)
- `src/lib` — Kite client, SERV, gifts, treasury (platform wallets), chains, sessions, signatures
- `src/components` — UI built on the design system in `src/app/styles`
- `design/` — the clickable prototype and architecture diagram
- `docs/ROADMAP.md` — what comes next (on-chain escrow, walletless claim, gifting autopilot, …)

## Notes

- v1 keeps unclaimed gift funds in a platform hot wallet; on-chain escrow contracts are the first item on the roadmap.
- Keep `.env.local` out of version control — it holds the platform wallet keys.
