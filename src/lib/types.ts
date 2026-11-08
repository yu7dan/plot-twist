import type { NetworkId } from "./chains";
import type { SentPayout } from "./treasury";

export type GiftStatus =
  | "awaiting_payment" // transfer requested, waiting for the sender's passkey
  | "payment_failed"
  | "sealed" // paid and verified on-chain, waiting for the recipient
  | "claiming"
  | "claimed"
  | "reclaiming"
  | "reclaimed"; // unclaimed past its window and taken back by the sender

/** How long the recipient has to claim, chosen by the sender. */
export const EXPIRY_OPTIONS = [24, 72, 168, 720] as const;
export type ExpiryHours = (typeof EXPIRY_OPTIONS)[number];
export const DEFAULT_EXPIRY: ExpiryHours = 24;

export interface GiftDesign {
  recipientName: string;
  occasion: string;
  /** Gift amount in dollars, as a 2-decimal string. */
  amount: string;
  network: NetworkId;
  note: string;
}

export interface Gift extends GiftDesign {
  code: string;
  createdAt: string;
  prompt: string;
  senderName: string;
  fee: string;
  status: GiftStatus;
  /** Kite user that paid for it; only they see it in My gifts. */
  ownerId: string;
  /** Random per gift; the recipient signs it to prove they own the claim address. */
  claimNonce: string;
  expiresInHours: ExpiryHours;
  /** Set when the gift is sealed: the clock starts once the link exists. After it, the sender may take it back. */
  expiresAt?: string;
  payment: {
    requestId: string;
    approvalUrl: string;
    from?: string;
    txHash?: string;
    error?: string;
    confirmedAt?: string;
  };
  /** `sent` is recorded the moment a payout is broadcast; `txHash` once it's confirmed. */
  claim?: { address: string; accountId?: string; pasted?: boolean; lockedAt?: string; sent?: SentPayout; txHash?: string; claimedAt?: string };
  /** `batch`: taken back together with the rest of its Drop in one transfer. */
  reclaim?: { to: string; lockedAt?: string; sent?: SentPayout; txHash?: string; reclaimedAt?: string; batch?: string };
  /** Set on gifts that belong to a Drop; their payment is the Drop's. */
  dropId?: string;
  /** Where the sender will deliver the link (a handle, an email…), for their own reference. */
  contact?: string;
}

export type DropStatus = "awaiting_payment" | "payment_failed" | "live";

/** One Kite payment for a list of people; each person gets an ordinary gift link. */
export interface Drop {
  id: string;
  createdAt: string;
  ownerId: string;
  senderName: string;
  title: string;
  occasion: string;
  prompt: string;
  network: NetworkId;
  /** Sum of the gift amounts, and of the per-person fees, as 2-decimal strings. */
  amount: string;
  fee: string;
  status: DropStatus;
  expiresInHours: ExpiryHours;
  expiresAt?: string;
  /** The gift codes, in the sender's order. */
  codes: string[];
  payment: Gift["payment"];
  /** A take-back of everything unclaimed, sent as one transfer. */
  reclaim?: { to: string; codes: string[]; amount: string; lockedAt: string; txHash?: string };
}

/** What the recipient's link can see. */
export interface PublicGift extends GiftDesign {
  code: string;
  createdAt: string;
  senderName: string;
  status: GiftStatus;
  claimNonce?: string;
  expiresAt?: string;
  claim?: { address: string; txHash?: string; claimedAt?: string };
}

export function toPublicGift(g: Gift): PublicGift {
  return {
    code: g.code,
    createdAt: g.createdAt,
    senderName: g.senderName,
    recipientName: g.recipientName,
    occasion: g.occasion,
    amount: g.amount,
    network: g.network,
    note: g.note,
    status: g.status,
    claimNonce: g.status === "sealed" ? g.claimNonce : undefined,
    expiresAt: g.expiresAt,
    claim: g.claim && { address: g.claim.address, txHash: g.claim.txHash ?? g.claim.sent?.hash, claimedAt: g.claim.claimedAt },
  };
}

export const claimMessage = (code: string, address: string, nonce: string) =>
  `Claim my Plot Twist gift ${code} to ${address}.\nNonce: ${nonce}`;
