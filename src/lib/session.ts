import "server-only";
import crypto from "crypto";
import { cookies } from "next/headers";
import { collection, newId } from "./store";

/**
 * Sender session. The Kite Passport token never reaches the browser: the cookie
 * only holds a random id, and the token is stored encrypted on the server.
 */
const COOKIE = "pt_sid";
const MAX_AGE = 60 * 60 * 24 * 14;

interface StoredSession {
  id: string;
  createdAt: string;
  kite?: { token: string; email: string; userId?: string; expiresAt?: string };
}

const sessions = collection<StoredSession>("sessions");

function key() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) throw new Error("SESSION_SECRET is not set (16+ chars)");
  return crypto.createHash("sha256").update(secret).digest();
}

function seal(text: string) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([c.update(text, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), body].map((b) => b.toString("base64url")).join(".");
}

function open(sealed: string) {
  const [iv, tag, body] = sealed.split(".").map((s) => Buffer.from(s, "base64url"));
  const d = crypto.createDecipheriv("aes-256-gcm", key(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(body), d.final()]).toString("utf8");
}

function jwtExpiry(jwt: string) {
  try {
    const exp = JSON.parse(Buffer.from(jwt.split(".")[1], "base64url").toString()).exp;
    return typeof exp === "number" ? new Date(exp * 1000).toISOString() : undefined;
  } catch {
    return undefined;
  }
}

export interface KiteSession { sessionId: string; jwt: string; email: string; userId?: string }

export async function getKite(): Promise<KiteSession | null> {
  const id = (await cookies()).get(COOKIE)?.value;
  if (!id) return null;
  const s = await sessions.get(id);
  if (!s?.kite) return null;
  if (s.kite.expiresAt && new Date(s.kite.expiresAt) < new Date()) return null;
  try {
    return { sessionId: id, jwt: open(s.kite.token), email: s.kite.email, userId: s.kite.userId };
  } catch {
    return null;
  }
}

export async function saveKite(p: { jwt: string; email: string; userId?: string }) {
  const jar = await cookies();
  // Always a fresh id on sign-in, so a planted cookie can't inherit someone's login.
  const old = jar.get(COOKIE)?.value;
  if (old) await sessions.remove(old);
  const id = newId(24);
  await sessions.put(id, {
    id,
    createdAt: new Date().toISOString(),
    kite: { token: seal(p.jwt), email: p.email, userId: p.userId, expiresAt: jwtExpiry(p.jwt) },
  });
  jar.set(COOKIE, id, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: MAX_AGE });
}

export async function clearKite() {
  const jar = await cookies();
  const id = jar.get(COOKIE)?.value;
  if (id) await sessions.remove(id);
  jar.delete(COOKIE);
}
