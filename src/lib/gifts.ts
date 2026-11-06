import "server-only";
import { linkWallet, type LinkedWallet } from "./accounts";
import { NETWORKS } from "./chains";
import { me, sendStatus, startSend } from "./kite";
import { feeFor, money, totalFor } from "./pricing";
import { collection, newId } from "./store";
import { sameAddress, validAddress, verifySignature } from "./signatures";
import { payoutStatus, platformAddress, sendPayout, settlePayout, verifyIncoming, type SentPayout } from "./treasury";
import { claimMessage, type ExpiryHours, type Gift, type GiftDesign } from "./types";

const gifts = collection<Gift>("gifts");

const newestFirst = (a: Gift, b: Gift) => b.createdAt.localeCompare(a.createdAt);

/** Reads a gift, first settling any payout that was still in flight. */
export async function getGift(code: string) {
  const g = await gifts.get(code);
  return g ? reconcile(g) : null;
}

export async function giftsOf(ownerId: string) {
  const mine = (await gifts.all()).filter((g) => g.ownerId === ownerId).sort(newestFirst);
  return Promise.all(mine.map(reconcile));
}

/** Gifts this account claimed: while signed in, or to one of its linked wallets. */
export async function receivedBy(accountId: string, wallets: LinkedWallet[]) {
  return (await gifts.all())
    .filter((g) => g.status === "claimed" && g.claim && (g.claim.accountId === accountId || wallets.some((w) => sameAddress(w.address, g.claim!.address))))
    .sort((a, b) => (b.claim?.claimedAt ?? "").localeCompare(a.claim?.claimedAt ?? ""));
}

/** Saves the gift and asks Kite for a passkey-approved transfer of gift + fee to the platform address. */
export async function createGift(jwt: string, ownerId: string, p: GiftDesign & { prompt: string; senderName: string; expiresInHours: ExpiryHours }) {
  const amount = Number(p.amount);
  // The code is the link's only secret: 128 bits, so links can't be guessed.
  const code = newId(16);
  const send = await startSend(jwt, {
    network: p.network,
    to: platformAddress(p.network),
    amount: money(totalFor(amount)),
    idempotencyKey: `gift-${code}`,
  });
  const gift: Gift = {
    ...p,
    amount: money(amount),
    fee: money(feeFor(amount)),
    code,
    createdAt: new Date().toISOString(),
    status: "awaiting_payment",
    ownerId,
    claimNonce: newId(8),
    payment: { requestId: send.requestId, approvalUrl: send.approvalUrl },
  };
  return gifts.put(code, gift);
}

/** Polls Kite for the transfer; once it executed, checks it on-chain and seals the gift. */
export async function refreshPayment(jwt: string, gift: Gift): Promise<Gift> {
  if (gift.status !== "awaiting_payment") return gift;
  const fail = async (patch: Partial<Gift["payment"]>) =>
    (await gifts.update(gift.code, (g) => (g.status === "awaiting_payment" ? { ...g, status: "payment_failed", payment: { ...g.payment, ...patch } } : null))) ??
    (await gifts.get(gift.code))!;

  const s = await sendStatus(jwt, gift.payment.requestId);
  if (s.state === "failed" || s.state === "expired") return fail({ error: s.error || s.state });
  if (s.state !== "completed" || !s.txHash) return gift;
  const txHash = s.txHash;

  // One on-chain transfer can only ever seal one gift.
  if ((await gifts.all()).some((g) => g.code !== gift.code && g.payment.txHash && g.payment.txHash.toLowerCase() === txHash.toLowerCase())) {
    return fail({ txHash, error: "This transfer was already used" });
  }
  const from = (await me(jwt)).wallets.find((w) => w.chain === gift.network)?.address;
  if (!from) return fail({ txHash, error: "No Kite wallet on this network" });
  const check = await verifyIncoming(gift.network, txHash, money(Number(gift.amount) + Number(gift.fee)), from);
  if (check.pending) return gift; // not visible on this RPC yet; the next poll checks again
  if (!check.ok) return fail({ txHash, from, error: check.reason });
  return (
    (await gifts.update(gift.code, (g) =>
      g.status !== "awaiting_payment"
        ? null
        : {
            ...g,
            status: "sealed",
            expiresAt: new Date(Date.now() + g.expiresInHours * 3_600_000).toISOString(),
            payment: { ...g.payment, from, txHash, confirmedAt: new Date().toISOString() },
          },
    )) ?? (await gifts.get(gift.code))!
  );
}

/* ---------- payouts: claim and take-back share the same safety rules ---------- */

type PayoutKind = "claim" | "reclaim";

/**
 * Settles a gift whose payout was broadcast but not yet confirmed (e.g. after a timeout or restart).
 * It only goes back to "sealed" when the transfer provably can't land — never paid twice.
 */
async function reconcile(g: Gift): Promise<Gift> {
  const kind: PayoutKind | null = g.status === "claiming" ? "claim" : g.status === "reclaiming" ? "reclaim" : null;
  if (!kind) return g;
  const sent = kind === "claim" ? g.claim?.sent : g.reclaim?.sent;
  if (!sent) {
    // Locked but never broadcast (the process died in between): safe to reopen after a minute.
    const lockedAt = (kind === "claim" ? g.claim?.lockedAt : g.reclaim?.lockedAt) ?? g.createdAt;
    if (Date.now() - new Date(lockedAt).getTime() < 60_000) return g;
    return (await gifts.update(g.code, (x) => (x.status === g.status && !(kind === "claim" ? x.claim?.sent : x.reclaim?.sent) ? { ...x, status: "sealed", claim: kind === "claim" ? undefined : x.claim, reclaim: kind === "reclaim" ? undefined : x.reclaim } : null))) ?? g;
  }
  const st = await payoutStatus(g.network, sent).catch(() => "pending" as const);
  return finish(g.code, kind, st);
}

async function finish(code: string, kind: PayoutKind, st: "success" | "failed" | "pending"): Promise<Gift> {
  const busy = kind === "claim" ? "claiming" : "reclaiming";
  if (st === "pending") return (await gifts.get(code))!;
  const now = new Date().toISOString();
  return (
    (await gifts.update(code, (x) => {
      if (x.status !== busy) return null;
      if (st === "failed") return { ...x, status: "sealed", claim: kind === "claim" ? undefined : x.claim, reclaim: kind === "reclaim" ? undefined : x.reclaim };
      return kind === "claim"
        ? { ...x, status: "claimed", claim: { ...x.claim!, txHash: x.claim!.sent!.hash, claimedAt: now } }
        : { ...x, status: "reclaimed", reclaim: { ...x.reclaim!, txHash: x.reclaim!.sent!.hash, reclaimedAt: now } };
    })) ?? (await gifts.get(code))!
  );
}

/** Broadcasts, records the hash immediately, then waits briefly for confirmation. */
async function pay(code: string, kind: PayoutKind, network: Gift["network"], to: string, amount: string): Promise<Gift> {
  let sent: SentPayout;
  try {
    sent = await sendPayout(network, to, amount);
  } catch (e) {
    // Nothing was broadcast, so the gift can go straight back to sealed.
    console.error(`${kind} payout not sent`, code, e);
    await finish(code, kind, "failed");
    throw e;
  }
  await gifts.update(code, (x) => (kind === "claim" ? { ...x, claim: { ...x.claim!, sent } } : { ...x, reclaim: { ...x.reclaim!, sent } }));
  return finish(code, kind, await settlePayout(network, sent));
}

/* ---------- expiry: the sender takes it back ---------- */

export const isPast = (iso?: string) => !!iso && new Date(iso).getTime() <= Date.now();
export const reclaimable = (g: Gift) => g.status === "sealed" && isPast(g.expiresAt);

export class ReclaimError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

/**
 * Past its window, an unclaimed gift can be taken back by its sender — to their Kite wallet on the same
 * network by default, or to another address. Only the gift amount comes back; the fee doesn't.
 * Until then the recipient can still claim it.
 */
export async function reclaimGift(code: string, ownerId: string, to?: string): Promise<Gift> {
  const gift = await getGift(code);
  if (!gift || gift.ownerId !== ownerId) throw new ReclaimError("Gift not found", 404);
  if (gift.status === "claimed" || gift.status === "claiming") throw new ReclaimError(`${gift.recipientName} already claimed it`, 409);
  if (gift.status === "reclaimed") throw new ReclaimError("You already took this gift back", 409);
  if (gift.status === "reclaiming") throw new ReclaimError("This gift is on its way back to you", 409);
  if (!reclaimable(gift)) throw new ReclaimError("You can take it back once the claim window ends", 409);
  const dest = to?.trim() || gift.payment.from;
  if (!dest || !validAddress(NETWORKS[gift.network].kind, dest)) throw new ReclaimError(`That isn't a ${NETWORKS[gift.network].name} address`);

  const locked = await gifts.update(code, (g) => (reclaimable(g) ? { ...g, status: "reclaiming", reclaim: { to: dest, lockedAt: new Date().toISOString() } } : null));
  if (!locked) throw new ReclaimError("This gift just changed. Refresh and try again.", 409);
  try {
    return await pay(code, "reclaim", gift.network, dest, gift.amount);
  } catch {
    throw new ReclaimError("The transfer didn't go through. Please try again.", 502);
  }
}

/* ---------- claim ---------- */

export class ClaimError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

/** `account` is set when the recipient is signed in; the claim then shows in their Dashboard. */
export async function claimGift(code: string, address: string, signature: string, account?: { id: string; email: string }): Promise<Gift> {
  const gift = await getGift(code);
  if (!gift) throw new ClaimError("Gift not found", 404);
  if (gift.status === "claimed") throw new ClaimError("This gift was already claimed", 409);
  if (gift.status === "claiming") throw new ClaimError("This gift is on its way to a wallet", 409);
  if (gift.status === "reclaimed" || gift.status === "reclaiming") throw new ClaimError(`${gift.senderName} took this gift back`, 410);
  if (gift.status !== "sealed") throw new ClaimError("This gift isn't ready to claim yet", 409);

  const net = NETWORKS[gift.network];
  if (!validAddress(net.kind, address)) throw new ClaimError("That isn't a valid wallet address");
  const message = claimMessage(gift.code, address, gift.claimNonce);
  if (!(await verifySignature(net.kind, address, message, signature, gift.network))) throw new ClaimError("Signature doesn't match this wallet", 401);

  const locked = await gifts.update(code, (g) =>
    g.status === "sealed" ? { ...g, status: "claiming", claim: { address, accountId: account?.id, lockedAt: new Date().toISOString() } } : null,
  );
  if (!locked) throw new ClaimError("This gift is being claimed", 409);
  let result: Gift;
  try {
    result = await pay(code, "claim", gift.network, address, gift.amount);
  } catch {
    throw new ClaimError("The transfer didn't go through. Please try again.", 502);
  }
  // The claim signature already proves the wallet is theirs.
  if (account && result.status !== "sealed") await linkWallet(account.id, account.email, address, net.kind).catch(() => undefined);
  if (result.status === "sealed") throw new ClaimError("The transfer didn't go through. Please try again.", 502);
  return result;
}
