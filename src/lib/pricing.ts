import type { NetworkId } from "./chains";

export const FEE_RATE = 0.015;
/** Minimum fee per network: what a payout costs us there, plus a little. On Solana we also pay the recipient's USDC account rent. */
export const FEE_MIN: Record<NetworkId, number> = { base: 0.25, solana: 0.5, polygon: 0.25, avalanche: 0.25, arc: 0.25, tempo: 0.25, robinhood: 0.25 };
export const GIFT_MIN = 5;
export const GIFT_MAX = 500;

export const money = (n: number) => n.toFixed(2);

/** Cents still missing to cover `need` (rounded up, without float noise: 131.3 - 0 must stay 131.30). */
export const shortfall = (need: number, have: number) => Math.max(0, Math.ceil(Number(((need - have) * 100).toFixed(6))) / 100);

/* Drop: one approval pays a whole list; each person gets their own gift link. */
export const DROP_FEE_RATE = 0.01;
export const DROP_FEE_MIN: Record<NetworkId, number> = { base: 0.1, solana: 0.4, polygon: 0.1, avalanche: 0.1, arc: 0.1, tempo: 0.1, robinhood: 0.1 };
export const DROP_EACH_MIN = 1;
export const DROP_EACH_MAX = 500;
export const DROP_MAX_PEOPLE = 200;
export const DROP_MAX_TOTAL = 5000;

export function dropFeeFor(amount: number, network: NetworkId) {
  return Math.max(Number((amount * DROP_FEE_RATE).toFixed(2)), DROP_FEE_MIN[network]);
}

/** What one Drop costs: every amount plus its per-person fee. */
export function dropTotals(amounts: number[], network: NetworkId) {
  const sum = amounts.reduce((s, a) => s + a, 0);
  const fee = amounts.reduce((s, a) => s + dropFeeFor(a, network), 0);
  return { sum: Number(sum.toFixed(2)), fee: Number(fee.toFixed(2)), total: Number((sum + fee).toFixed(2)) };
}

export function feeFor(amount: number, network: NetworkId) {
  return Math.max(Number((amount * FEE_RATE).toFixed(2)), FEE_MIN[network]);
}

/** What the sender's Kite wallet pays: the gift plus Plot Twist's fee. */
export const totalFor = (amount: number, network: NetworkId) => Number((amount + feeFor(amount, network)).toFixed(2));
