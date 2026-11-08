import type { NetworkId } from "./chains";

export const FEE_RATE = 0.015;
/** Minimum fee per network: what a payout costs us there, plus a little. On Solana we also pay the recipient's USDC account rent. */
export const FEE_MIN: Record<NetworkId, number> = { base: 0.25, solana: 0.5, polygon: 0.25, avalanche: 0.25, arc: 0.25, tempo: 0.25, robinhood: 0.25 };
export const GIFT_MIN = 5;
export const GIFT_MAX = 500;

export const money = (n: number) => n.toFixed(2);

export function feeFor(amount: number, network: NetworkId) {
  return Math.max(Number((amount * FEE_RATE).toFixed(2)), FEE_MIN[network]);
}

/** What the sender's Kite wallet pays: the gift plus Plot Twist's fee. */
export const totalFor = (amount: number, network: NetworkId) => Number((amount + feeFor(amount, network)).toFixed(2));
