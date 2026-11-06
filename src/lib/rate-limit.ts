import "server-only";
import { headers } from "next/headers";

/** In-memory sliding-window limiter (single instance). Keeps paid APIs and email sends from being abused. */
const g = globalThis as unknown as { __ptRate?: Map<string, number[]> };
const hits = (g.__ptRate ??= new Map());

const MIN = 60_000;

/** Records a hit and returns true when `key` went over `max` in the last `windowMs`. */
function over(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const list = (hits.get(key) ?? []).filter((t: number) => now - t < windowMs);
  list.push(now);
  hits.set(key, list);
  if (hits.size > 50_000) hits.clear(); // crude memory cap
  return list.length > max;
}

export async function clientIp() {
  const h = await headers();
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
} as const;

/** Returns a 429 response when the caller is over the limit, otherwise null. */
export async function rateLimit(bucket: keyof typeof LIMITS, extraKey?: string) {
  const { max, windowMs } = LIMITS[bucket];
  const key = `${bucket}:${extraKey ?? (await clientIp())}`;
  return over(key, max, windowMs) ? Response.json({ error: "Too many requests. Please try again in a few minutes." }, { status: 429 }) : null;
}
