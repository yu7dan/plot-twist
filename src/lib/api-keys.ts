import "server-only";
import crypto from "crypto";
import { collection, newId } from "./store";

/**
 * API keys let an agent prepare Gifts and Drops for a Plot Twist account. Only a hash is stored, keyed by
 * that hash, so a lookup is one read and a leaked database can't be replayed. Payments still need the
 * owner's Kite passkey — a key can only *prepare* things.
 */
export interface ApiKey {
  id: string;
  ownerId: string;
  email: string;
  name: string;
  /** First characters of the key, so the owner can tell keys apart. */
  prefix: string;
  /** sha256 of the key; also the record's storage id. */
  hash: string;
  createdAt: string;
  lastUsedAt?: string;
  revokedAt?: string;
}

const keys = collection<ApiKey>("apiKeys");
const hash = (key: string) => crypto.createHash("sha256").update(key).digest("hex");

export const MAX_KEYS = 10;

export async function createKey(ownerId: string, email: string, name: string) {
  if ((await listKeys(ownerId)).length >= MAX_KEYS) throw new Error(`You can have up to ${MAX_KEYS} keys`);
  const key = `pt_live_${crypto.randomBytes(24).toString("base64url")}`;
  const record: ApiKey = { id: newId(6), ownerId, email, name: name || "Agent", prefix: key.slice(0, 12), hash: hash(key), createdAt: new Date().toISOString() };
  await keys.put(record.hash, record);
  return { key, record };
}

export async function listKeys(ownerId: string) {
  return (await keys.all()).filter((k) => k.ownerId === ownerId && !k.revokedAt).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function revokeKey(ownerId: string, id: string) {
  const k = (await keys.all()).find((x) => x.ownerId === ownerId && x.id === id && !x.revokedAt);
  if (!k) return false;
  return !!(await keys.update(k.hash, (x) => (x.revokedAt ? null : { ...x, revokedAt: new Date().toISOString() })));
}

/** The account behind a `Bearer pt_live_…` header, or null. */
export async function authenticate(request: Request) {
  const m = request.headers.get("authorization")?.match(/^Bearer\s+(pt_live_[\w-]{20,})$/);
  if (!m) return null;
  const h = hash(m[1]);
  const k = await keys.get(h);
  if (!k || k.revokedAt) return null;
  // Touch at most once a minute.
  if (!k.lastUsedAt || Date.now() - new Date(k.lastUsedAt).getTime() > 60_000) {
    await keys.update(h, (x) => ({ ...x, lastUsedAt: new Date().toISOString() })).catch(() => undefined);
  }
  return k;
}
