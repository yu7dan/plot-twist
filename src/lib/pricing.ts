export const FEE_RATE = 0.015;
export const FEE_MIN = 1;
export const GIFT_MIN = 5;
export const GIFT_MAX = 500;

export const money = (n: number) => n.toFixed(2);

export function feeFor(amount: number) {
  return Math.max(Number((amount * FEE_RATE).toFixed(2)), FEE_MIN);
}

/** What the sender's Kite wallet pays: the gift plus Plot Twist's fee. */
export const totalFor = (amount: number) => Number((amount + feeFor(amount)).toFixed(2));
