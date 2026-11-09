import "server-only";
import { listKeys } from "./api-keys";
import { getDrop } from "./drops";
import { getGift } from "./gifts";
import { requestsOf, type AgentRequest } from "./requests";
import { counters } from "./store";

/**
 * Agent API usage, per key per UTC day: every authenticated call, and every Gift or Drop an agent prepared.
 * The API itself is free — Plot Twist earns its usual fee only when the owner approves and pays — so these
 * numbers are for the owner's Developers view, not billing.
 */
const usage = counters("usage");
const day = (d = new Date()) => d.toISOString().slice(0, 10);
const field = (keyId: string, d: string, what: "requests" | "prepared") => `${keyId}|${d}|${what}`;

export async function recordUsage(keyId: string, what: "requests" | "prepared") {
  await usage.incr(field(keyId, day(), what)).catch((e) => console.error("usage not recorded", e));
}

const amountOf = (r: AgentRequest) =>
  r.gift ? Number(r.gift.amount) : (r.drop?.recipients ?? []).reduce((s, x) => s + x.amount, 0);

/** Paid amount and fee of an approved request, once its gift / Drop is actually paid. */
async function paidOf(r: AgentRequest) {
  if (r.giftCode) {
    const g = await getGift(r.giftCode);
    if (g && !["awaiting_payment", "payment_failed"].includes(g.status)) return { amount: Number(g.amount), fee: Number(g.fee), status: g.status === "sealed" ? "live" : g.status };
    return { amount: 0, fee: 0, status: g?.status ?? "pending_approval" };
  }
  if (r.dropId) {
    const d = await getDrop(r.dropId);
    if (d?.status === "live") return { amount: Number(d.amount), fee: Number(d.fee), status: "live" };
    return { amount: 0, fee: 0, status: d?.status ?? "pending_approval" };
  }
  return { amount: 0, fee: 0, status: "pending_approval" };
}

export async function developerStats(ownerId: string, days: number) {
  const keys = await listKeys(ownerId);
  const dayList = Array.from({ length: days }, (_, i) => day(new Date(Date.now() - (days - 1 - i) * 86_400_000)));
  const prevList = Array.from({ length: days }, (_, i) => day(new Date(Date.now() - (2 * days - 1 - i) * 86_400_000)));
  const fields = keys.flatMap((k) => [...dayList, ...prevList].flatMap((d) => [field(k.id, d, "requests"), field(k.id, d, "prepared")]));
  const n = await usage.getMany(fields);

  const since = new Date(dayList[0]).getTime();
  const all = await requestsOf(ownerId);
  const inRange = all.filter((r) => new Date(r.createdAt).getTime() >= since);
  const paid = new Map(await Promise.all(inRange.filter((r) => r.status === "approved").map(async (r) => [r.id, await paidOf(r)] as const)));

  const sum = (ids: string[], list: string[], what: "requests" | "prepared") => ids.reduce((s, id) => s + list.reduce((t, d) => t + (n[field(id, d, what)] ?? 0), 0), 0);
  const ids = keys.map((k) => k.id);
  const requests = sum(ids, dayList, "requests");
  const before = sum(ids, prevList, "requests");
  const approved = inRange.filter((r) => r.status === "approved").length;
  const volume = [...paid.values()].reduce((s, p) => s + p.amount, 0);
  const fees = [...paid.values()].reduce((s, p) => s + p.fee, 0);

  return {
    days: dayList,
    totals: {
      requests,
      change: before ? Math.round(((requests - before) / before) * 100) : null,
      prepared: inRange.length,
      gifts: inRange.filter((r) => r.kind === "gift").length,
      drops: inRange.filter((r) => r.kind === "drop").length,
      approved,
      approvalRate: inRange.length ? Math.round((approved / inRange.length) * 100) : null,
      volume: volume.toFixed(2),
      fees: fees.toFixed(2),
    },
    chart: dayList.map((d) => ({ day: d, requests: ids.reduce((s, id) => s + (n[field(id, d, "requests")] ?? 0), 0), prepared: ids.reduce((s, id) => s + (n[field(id, d, "prepared")] ?? 0), 0) })),
    keys: keys.map((k) => {
      const mine = inRange.filter((r) => r.keyId === k.id);
      return {
        id: k.id, name: k.name, prefix: k.prefix, createdAt: k.createdAt, lastUsedAt: k.lastUsedAt,
        requests: sum([k.id], dayList, "requests"),
        prepared: mine.length,
        volume: mine.reduce((s, r) => s + (paid.get(r.id)?.amount ?? 0), 0).toFixed(2),
        daily: dayList.map((d) => n[field(k.id, d, "requests")] ?? 0),
      };
    }),
    recent: await Promise.all(all.slice(0, 8).map(async (r) => {
      const p = r.status === "approved" ? paid.get(r.id) ?? (await paidOf(r)) : null;
      return {
        id: r.id, kind: r.kind, createdAt: r.createdAt,
        keyName: keys.find((k) => k.id === r.keyId)?.name ?? "Revoked key",
        summary: r.gift ? `Gift for ${r.gift.recipientName}` : `${r.drop?.title} · ${r.drop?.recipients.length} people`,
        amount: amountOf(r).toFixed(2),
        status: p ? p.status : "pending_approval",
        dropId: r.dropId, giftCode: r.giftCode,
      };
    })),
  };
}
