import "server-only";
import { NETWORKS, type NetworkId } from "./chains";
import { finish, isPast, reclaimable, reconcile, transferUsed } from "./gifts";
import { me, sendStatus, startSend } from "./kite";
import { dropFeeFor, dropTotals, money } from "./pricing";
import { validAddress } from "./signatures";
import { collection, newId } from "./store";
import { payoutAddressProblem, platformAddress, sendPayout, settlePayout, verifyIncoming, type SentPayout } from "./treasury";
import type { Drop, ExpiryHours, Gift } from "./types";

/**
 * A Drop is one Kite payment for a list of people. Each person gets an ordinary gift (same link, claim and
 * take-back rules); the Drop ties them together, verifies the single payment and can take back everything
 * that's unclaimed in one transfer.
 */
const drops = collection<Drop>("drops");
const gifts = collection<Gift>("gifts");

export interface DropRecipient { name: string; contact?: string; amount: number; note: string }

export async function createDrop(
  jwt: string,
  ownerId: string,
  p: { title: string; occasion: string; prompt: string; senderName: string; network: NetworkId; expiresInHours: ExpiryHours; recipients: DropRecipient[] },
) {
  const id = newId(16);
  const t = dropTotals(p.recipients.map((r) => r.amount), p.network);
  const send = await startSend(jwt, { network: p.network, to: platformAddress(p.network), amount: money(t.total), idempotencyKey: `drop-${id}` });
  const now = new Date().toISOString();
  const payment = { requestId: send.requestId, approvalUrl: send.approvalUrl };
  const list: Gift[] = p.recipients.map((r) => ({
    // Each link is its own 128-bit secret, like any gift.
    code: newId(16),
    createdAt: now,
    prompt: p.prompt,
    senderName: p.senderName,
    recipientName: r.name,
    contact: r.contact || undefined,
    occasion: p.occasion,
    amount: money(r.amount),
    fee: money(dropFeeFor(r.amount, p.network)),
    network: p.network,
    note: r.note,
    status: "awaiting_payment",
    ownerId,
    claimNonce: newId(8),
    expiresInHours: p.expiresInHours,
    payment,
    dropId: id,
  }));
  await gifts.putMany(Object.fromEntries(list.map((g) => [g.code, g])));
  const drop: Drop = {
    id, createdAt: now, ownerId, senderName: p.senderName, title: p.title, occasion: p.occasion, prompt: p.prompt, network: p.network,
    amount: money(t.sum), fee: money(t.fee), status: "awaiting_payment", expiresInHours: p.expiresInHours, codes: list.map((g) => g.code), payment,
  };
  return drops.put(id, drop);
}

/** The Drop's gifts follow its payment; safe to repeat (also repairs a seal that was cut off halfway). */
async function syncGifts(d: Drop) {
  if (d.status === "awaiting_payment") return;
  await Promise.all(
    d.codes.map((code) =>
      gifts.update(code, (g) =>
        g.status !== "awaiting_payment" ? null
          : d.status === "payment_failed" ? { ...g, status: "payment_failed", payment: d.payment }
          : { ...g, status: "sealed", expiresAt: d.expiresAt, payment: d.payment },
      ),
    ),
  );
}

/** Polls Kite for the Drop's transfer; once it executed, checks it on-chain and opens every link. */
export async function refreshDrop(jwt: string, drop: Drop): Promise<Drop> {
  if (drop.status !== "awaiting_payment") return drop;
  const fail = async (patch: Partial<Drop["payment"]>) => {
    const d = (await drops.update(drop.id, (x) => (x.status === "awaiting_payment" ? { ...x, status: "payment_failed", payment: { ...x.payment, ...patch } } : null))) ?? (await drops.get(drop.id))!;
    await syncGifts(d);
    return d;
  };

  const s = await sendStatus(jwt, drop.payment.requestId);
  if (s.state === "failed" || s.state === "expired") return fail({ error: s.error || s.state });
  if (s.state !== "completed" || !s.txHash) return drop;
  const txHash = s.txHash;
  if (await transferUsed(txHash, { dropId: drop.id })) return fail({ txHash, error: "This transfer was already used" });
  const from = (await me(jwt)).wallets.find((w) => w.chain === drop.network)?.address;
  if (!from) return fail({ txHash, error: "No Kite wallet on this network" });
  const check = await verifyIncoming(drop.network, txHash, money(Number(drop.amount) + Number(drop.fee)), from);
  if (check.pending) return drop;
  if (!check.ok) return fail({ txHash, from, error: check.reason });

  const d =
    (await drops.update(drop.id, (x) =>
      x.status !== "awaiting_payment" ? null : {
        ...x,
        status: "live",
        expiresAt: new Date(Date.now() + x.expiresInHours * 3_600_000).toISOString(),
        payment: { ...x.payment, from, txHash, confirmedAt: new Date().toISOString() },
      },
    )) ?? (await drops.get(drop.id))!;
  await syncGifts(d);
  return d;
}

export async function getDrop(id: string) {
  return drops.get(id);
}

export async function dropsOf(ownerId: string) {
  return (await drops.all()).filter((d) => d.ownerId === ownerId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** The Drop with each person's live status, for its owner. */
export async function dropView(drop: Drop) {
  await syncGifts(drop);
  const list = await Promise.all(drop.codes.map(async (code) => {
    const g = await gifts.get(code);
    return g ? reconcile(g) : null;
  }));
  const items = list.filter((g): g is Gift => !!g);
  const claimed = items.filter((g) => g.status === "claimed");
  const open = items.filter((g) => g.status === "sealed");
  const net = NETWORKS[drop.network];
  return {
    id: drop.id, title: drop.title, occasion: drop.occasion, network: drop.network, status: drop.status, createdAt: drop.createdAt,
    amount: drop.amount, fee: drop.fee, expiresAt: drop.expiresAt, error: drop.payment.error,
    approvalUrl: drop.status === "awaiting_payment" ? drop.payment.approvalUrl : undefined,
    paymentTxUrl: drop.payment.txHash ? net.txUrl(drop.payment.txHash) : undefined,
    count: items.length,
    claimedCount: claimed.length,
    claimedAmount: money(claimed.reduce((s, g) => s + Number(g.amount), 0)),
    openAmount: money(open.reduce((s, g) => s + Number(g.amount), 0)),
    reclaimable: drop.status === "live" && isPast(drop.expiresAt) && open.some(reclaimable),
    reclaimTo: drop.payment.from,
    reclaimTxUrl: drop.reclaim?.txHash ? net.txUrl(drop.reclaim.txHash) : undefined,
    recipients: items.map((g) => ({
      code: g.code, name: g.recipientName, contact: g.contact, amount: g.amount, note: g.note, status: g.status,
      claimedAt: g.claim?.claimedAt, txUrl: g.claim?.txHash ? net.txUrl(g.claim.txHash) : undefined,
    })),
  };
}

export class DropError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

/**
 * After the claim window, takes back every unclaimed link in one transfer — to the sender's Kite wallet by
 * default. Each gift is locked first, so a recipient claiming at the same moment can't be paid twice; the fees
 * aren't refunded. Recipients can claim until this happens.
 */
export async function reclaimDrop(id: string, ownerId: string, to?: string) {
  const drop = await drops.get(id);
  if (!drop || drop.ownerId !== ownerId) throw new DropError("Drop not found", 404);
  if (drop.status !== "live") throw new DropError("This Drop isn't live", 409);
  if (!isPast(drop.expiresAt)) throw new DropError("You can take it back once the claim window ends", 409);
  const net = NETWORKS[drop.network];
  const dest = to?.trim() || drop.payment.from;
  if (!dest || !validAddress(net.kind, dest)) throw new DropError(`That isn't a ${net.name} address`);
  if (to?.trim()) {
    const problem = await payoutAddressProblem(drop.network, dest).catch(() => "We couldn't check that address. Please try again.");
    if (problem) throw new DropError(problem);
  }

  // Lock each still-open gift; only these are paid back.
  const lockedAt = new Date().toISOString();
  const locked = (await Promise.all(drop.codes.map(async (code) => {
    const g = await gifts.get(code);
    if (g) await reconcile(g);
    return gifts.update(code, (x) => (reclaimable(x) ? { ...x, status: "reclaiming", reclaim: { to: dest, lockedAt, batch: id } } : null));
  }))).filter((g): g is Gift => !!g);
  if (!locked.length) throw new DropError("Nothing left to take back", 409);

  const amount = money(locked.reduce((s, g) => s + Number(g.amount), 0));
  const codes = locked.map((g) => g.code);
  let sent: SentPayout;
  try {
    sent = await sendPayout(drop.network, dest, amount);
  } catch (e) {
    console.error("drop reclaim not sent", id, e);
    await Promise.all(codes.map((c) => finish(c, "reclaim", "failed")));
    throw new DropError("The transfer didn't go through. Please try again.", 502);
  }
  // Every gift records the same transfer, so each one settles on its own even after a timeout.
  await Promise.all(codes.map((c) => gifts.update(c, (x) => (x.status === "reclaiming" ? { ...x, reclaim: { ...x.reclaim!, sent } } : null))));
  await drops.update(id, (x) => ({ ...x, reclaim: { to: dest, codes, amount, lockedAt, txHash: sent.hash } }));
  const st = await settlePayout(drop.network, sent);
  await Promise.all(codes.map((c) => finish(c, "reclaim", st)));
  if (st === "failed") await drops.update(id, (x) => (x.reclaim?.txHash === sent.hash ? { ...x, reclaim: undefined } : null));
  return { status: st, amount, count: codes.length, to: dest, txUrl: net.txUrl(sent.hash) };
}
