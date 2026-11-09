import "server-only";
import type { ApiKey } from "./api-keys";
import { NETWORKS, type NetworkId } from "./chains";
import { createDrop, dropView, getDrop, refreshDrop, type DropRecipient } from "./drops";
import { createGift, getGift, refreshPayment } from "./gifts";
import { collection, newId } from "./store";
import type { ExpiryHours, GiftDesign } from "./types";

/**
 * Something an agent prepared with an API key: a Gift or a Drop waiting for its owner to approve it.
 * Approving creates the real gift / Drop with the owner's Kite session, which starts the passkey payment —
 * so a key alone can never move money.
 */
export interface AgentRequest {
  id: string;
  ownerId: string;
  keyId: string;
  createdAt: string;
  status: "pending" | "approved";
  kind: "gift" | "drop";
  brief: string;
  expiresInHours: ExpiryHours;
  gift?: GiftDesign;
  drop?: { title: string; occasion: string; network: NetworkId; recipients: DropRecipient[] };
  /** Set once approved. */
  giftCode?: string;
  dropId?: string;
  approvedAt?: string;
}

const requests = collection<AgentRequest>("requests");

export async function createRequest(key: ApiKey, p: Pick<AgentRequest, "kind" | "brief" | "expiresInHours" | "gift" | "drop">) {
  const r: AgentRequest = { ...p, id: newId(16), ownerId: key.ownerId, keyId: key.id, createdAt: new Date().toISOString(), status: "pending" };
  return requests.put(r.id, r);
}

export const getRequest = (id: string) => requests.get(id);

export async function requestsOf(ownerId: string) {
  return (await requests.all()).filter((r) => r.ownerId === ownerId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export class RequestError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

/** The owner approves: the gift or Drop is created now and Kite's passkey approval link comes back. */
export async function approveRequest(jwt: string, ownerId: string, email: string, id: string) {
  const r = await requests.get(id);
  if (!r || r.ownerId !== ownerId) throw new RequestError("Request not found", 404);
  if (r.status !== "pending") throw new RequestError("This request was already approved", 409);
  // Claim the request first so a double click can't create two payments.
  const claimed = await requests.update(id, (x) => (x.status === "pending" ? { ...x, status: "approved", approvedAt: new Date().toISOString() } : null));
  if (!claimed) throw new RequestError("This request was already approved", 409);
  const senderName = email.split("@")[0];
  try {
    if (r.kind === "gift" && r.gift) {
      const g = await createGift(jwt, ownerId, { ...r.gift, prompt: r.brief, senderName, expiresInHours: r.expiresInHours });
      await requests.update(id, (x) => ({ ...x, giftCode: g.code }));
      return { kind: "gift" as const, code: g.code, approvalUrl: g.payment.approvalUrl };
    }
    if (r.kind === "drop" && r.drop) {
      const d = await createDrop(jwt, ownerId, { ...r.drop, prompt: r.brief, senderName, expiresInHours: r.expiresInHours });
      await requests.update(id, (x) => ({ ...x, dropId: d.id }));
      return { kind: "drop" as const, id: d.id, approvalUrl: d.payment.approvalUrl };
    }
    throw new RequestError("This request is incomplete");
  } catch (e) {
    // Nothing was created: let the owner try again.
    await requests.update(id, (x) => (x.giftCode || x.dropId ? null : { ...x, status: "pending", approvedAt: undefined }));
    throw e;
  }
}

/** What the agent (and the approval page) sees. `jwt` lets the owner's own view refresh a pending payment. */
export async function requestView(r: AgentRequest, origin: string, jwt?: string) {
  const base = { id: r.id, kind: r.kind, createdAt: r.createdAt, approveUrl: `${origin}/approve/${r.id}`, expiresInHours: r.expiresInHours };
  if (r.kind === "gift" && r.gift) {
    let g = r.giftCode ? await getGift(r.giftCode) : null;
    if (g && jwt && g.status === "awaiting_payment") g = await refreshPayment(jwt, g).catch(() => g);
    const status = !g ? "pending_approval" : g.status === "sealed" ? "live" : g.status;
    return {
      ...base, status,
      gift: { ...r.gift, network: r.gift.network, networkName: NETWORKS[r.gift.network].name },
      link: g && !["awaiting_payment", "payment_failed"].includes(g.status) ? `${origin}/g/${g.code}` : undefined,
      approvalUrl: g?.status === "awaiting_payment" ? g.payment.approvalUrl : undefined,
      claimedAt: g?.claim?.claimedAt,
    };
  }
  if (r.kind === "drop" && r.drop) {
    let d = r.dropId ? await getDrop(r.dropId) : null;
    if (d && jwt && d.status === "awaiting_payment") d = await refreshDrop(jwt, d).catch(() => d);
    const v = d ? await dropView(d) : null;
    const total = r.drop.recipients.reduce((s, x) => s + x.amount, 0);
    return {
      ...base,
      status: !d ? "pending_approval" : d.status,
      drop: { title: r.drop.title, occasion: r.drop.occasion, network: r.drop.network, networkName: NETWORKS[r.drop.network].name, count: r.drop.recipients.length, amount: total.toFixed(2), recipients: r.drop.recipients },
      dropId: d?.id,
      approvalUrl: d?.status === "awaiting_payment" ? d.payment.approvalUrl : undefined,
      links: v && v.status === "live" ? v.recipients.map((x) => ({ name: x.name, contact: x.contact, amount: x.amount, status: x.status === "sealed" ? "waiting" : x.status, link: `${origin}/g/${x.code}` })) : undefined,
    };
  }
  return { ...base, status: "invalid" };
}
