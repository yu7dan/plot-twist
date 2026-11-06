# Roadmap

Where Plot Twist goes after the hackathon build.

## 1. On-chain escrow (v2)

Today gifts are paid and claimed on-chain (every transfer has a public tx hash), but funds waiting to be claimed sit in a platform hot wallet and gift state lives in our database.

Next, each network gets an escrow contract. A gift's funds are locked in the contract: only the recipient (with a signature) can claim them, and only the sender can take them back after the claim window. The platform itself can't move them.

- EVM first (Base, Polygon, Avalanche, Arc, Tempo, Robinhood Chain), then a Solana program.
- Per-gift deposit addresses (CREATE2) so the sender's Kite Passport transfer lands straight in escrow.

## 2. Product

1. **No wallet needed to receive** — claim with an email or phone number into an embedded wallet, and cash out later.
2. **Gifting autopilot** — "send Mom $50 every birthday, at most $200 a month": an agent remembers the dates, SERV writes the notes, and Kite Passport spends only within the limits the sender approved with their passkey.
3. **Group gifts** — one link, several friends chip in, the gift unlocks when the goal is reached and is signed by everyone.
4. **Conditional gifts** — opens on the birthday itself, after solving a SERV riddle, or as a time capsule.
5. **Thank-you and return gifts** — the recipient replies with a card or a gift of their own.
6. **More than dollars** — tokenized stocks on Robinhood Chain, gift cards, and physical gifts through Kite's shopping rails.
