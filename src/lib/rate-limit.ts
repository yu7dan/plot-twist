import "server-only";
import { headers } from "next/headers";
import { key, redis } from "./redis";

/**
 * Keeps paid APIs and email sends from being abused. Production counts hits in Redis
 * (fixed windows, shared by every instance); local dev uses an in-memory sliding window.
 */
const g = globalThis as unknown as { __ptRate?: Map<string, number[]> };
const hits = (g.__ptRate ??= new Map());

const MIN = 60_000;

/** Records a hit and returns true when `id` went over `max` in the last `windowMs`. */
function overLocal(id: string, max: number, windowMs: number) {
  const now = Date.now();
  const list = (hits.get(id) ?? []).filter((t: number) => now - t < windowMs);
  list.push(now);
  hits.set(id, list);
  if (hits.size > 50_000) hits.clear(); // crude memory cap
  return list.length > max;
}

const HIT = `local n = redis.call('INCR', KEYS[1]) if n == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end return n`;

async function over(id: string, max: number, windowMs: number) {
  const db = redis();
  if (!db) return overLocal(id, max, windowMs);
  const window = Math.floor(Date.now() / windowMs);
  return Number(await db.eval(HIT, [key("rl", id, String(window))], [String(windowMs)])) > max;
}

export async function clientIp() {
  const h = await headers();
  // Vercel overwrites x-forwarded-for / x-real-ip, while cf-connecting-ip there would be client-controlled.
  if (process.env.VERCEL) return h.get("x-real-ip") || h.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  return h.get("cf-connecting-ip") || h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "local";
}

export const LIMITS = {
  login: { max: 8, windowMs: 10 * MIN },
  loginEmail: { max: 3, windowMs: 10 * MIN },
  verify: { max: 15, windowMs: 10 * MIN },
  serv: { max: 30, windowMs: 10 * MIN },
  ask: { max: 15, windowMs: 10 * MIN },
  giftRead: { max: 120, windowMs: 10 * MIN },
  claim: { max: 10, windowMs: 10 * MIN },
  link: { max: 20, windowMs: 10 * MIN },
  api: { max: 60, windowMs: 10 * MIN },
} as const;

/** Returns a 429 response when the caller is over the limit, otherwise null. */
export async function rateLimit(bucket: keyof typeof LIMITS, extraKey?: string) {
  const { max, windowMs } = LIMITS[bucket];
  const id = `${bucket}:${extraKey ?? (await clientIp())}`;
  return (await over(id, max, windowMs)) ? Response.json({ error: "Too many requests. Please try again in a few minutes." }, { status: 429 }) : null;
}
