import "server-only";
import crypto from "crypto";
import { NETWORKS, isNetworkId, type NetworkId } from "./chains";

/**
 * Kite Passport HTTP client. Plot Twist acts as the sender's agent: the sender
 * signs in with an email code, and every transfer is approved by the sender's
 * passkey on agentpassport.ai. Paths mirror what the official kpass CLI calls.
 */
const BASE = process.env.KITE_PASSPORT_URL || "https://passport.prod.gokite.ai";

export class KiteError extends Error {
  constructor(message: string, public status: number, public code?: string) {
    super(message);
  }
}

async function call<T>(path: string, init: RequestInit & { jwt?: string } = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body) headers.set("Content-Type", "application/json");
  if (init.jwt) headers.set("Authorization", `Bearer ${init.jwt}`);
  const res = await fetch(BASE + path, { ...init, headers, cache: "no-store" });
  const text = await res.text();
  let json: Record<string, unknown> = {};
  try { json = text ? JSON.parse(text) : {}; } catch { /* non-JSON error page */ }
  if (!res.ok) {
    const msg = typeof json.error === "string" ? json.error : `Kite request failed (${res.status})`;
    throw new KiteError(msg, res.status, typeof json.error_code === "string" ? json.error_code : undefined);
  }
  return ((json.data ?? json) as T);
}

/* ---------- sign in ---------- */

export async function loginInit(email: string) {
  const d = await call<{ login_id: string; expires_at?: string }>("/v1/login/init", {
    method: "POST",
    body: JSON.stringify({ email, client: "web" }),
  });
  return { loginId: d.login_id, expiresAt: d.expires_at };
}

export async function loginVerify(loginId: string, code: string) {
  const d = await call<{ jwt?: string; access_token?: string; token?: string; email?: string; user_id?: string }>("/v1/login/verify", {
    method: "POST",
    body: JSON.stringify({ login_id: loginId, code: code.trim().toUpperCase() }),
  });
  const jwt = d.jwt || d.access_token || d.token;
  if (!jwt) throw new KiteError("Kite did not return a session", 502);
  return { jwt, email: d.email, userId: d.user_id };
}

/* ---------- sign up (new Passport) ---------- */

/** Kite emails a verification link and a code. The link is where the new user creates their passkey. */
export async function signupInit(email: string) {
  const d = await call<{ signup_id: string; expires_at?: string; poll_interval_seconds?: number }>("/v1/signup/init", {
    method: "POST",
    body: JSON.stringify({ email, client: "web" }),
  });
  return { signupId: d.signup_id, expiresAt: d.expires_at };
}

export async function signupStatus(signupId: string) {
  const d = await call<{ verification_status?: string; status?: string }>(`/v1/signup/status?signup_id=${encodeURIComponent(signupId)}`);
  return (d.verification_status || d.status || "pending") as "pending" | "verified" | "expired";
}

export async function signupExchange(signupId: string, code: string) {
  const d = await call<{ jwt?: string; access_token?: string; token?: string; email?: string; user_id?: string }>("/v1/signup/exchange", {
    method: "POST",
    body: JSON.stringify({ signup_id: signupId, code: code.trim().toUpperCase() }),
  });
  const jwt = d.jwt || d.access_token || d.token;
  if (!jwt) throw new KiteError("Kite did not return a session", 502);
  return { jwt, email: d.email, userId: d.user_id };
}

export interface KiteWallet { chain: string; address: string; vm_family: "evm" | "solana" }

export async function me(jwt: string) {
  return call<{ user_id: string; email: string; wallet_address: string; wallets: KiteWallet[]; passkey_readiness?: string }>("/v1/me", { jwt });
}

/* ---------- balances ---------- */

interface RawBalances {
  total_usd_approx: string;
  assets: { asset: string; decimals: number; total: string; chains: { chain: string; amount: string }[] }[];
}

/** Spendable gift balance per network: USDC everywhere, USDG on Robinhood Chain. */
export async function balances(jwt: string): Promise<{ total: number; byNetwork: Record<NetworkId, number> }> {
  const d = await call<RawBalances>("/v1/wallets/balances?fresh=true", { jwt });
  const byNetwork = Object.fromEntries(Object.keys(NETWORKS).map((id) => [id, 0])) as Record<NetworkId, number>;
  for (const a of d.assets) {
    for (const c of a.chains) {
      if (isNetworkId(c.chain) && NETWORKS[c.chain].asset.symbol === a.asset) byNetwork[c.chain] = Number(c.amount) || 0;
    }
  }
  return { total: Number(d.total_usd_approx) || 0, byNetwork };
}

/* ---------- transfers ---------- */

export interface SendRequest { requestId: string; approvalUrl: string }

/** Starts a passkey-approved transfer from the sender's Passport wallet. Nothing moves until they approve. */
export async function startSend(jwt: string, p: { network: NetworkId; to: string; amount: string; idempotencyKey?: string }): Promise<SendRequest> {
  const net = NETWORKS[p.network];
  const d = await call<{ request_id: string; approval_url: string }>("/v2/wallets/send/stepup", {
    method: "POST",
    jwt,
    headers: { "Idempotency-Key": p.idempotencyKey || crypto.randomUUID() },
    body: JSON.stringify({ amount: p.amount, asset: net.asset.symbol, chain: net.id, to: p.to }),
  });
  // The link is shown to the user, so only ever pass on Kite's own approval page.
  if (!(d.approval_url ?? "").startsWith("https://agentpassport.ai/")) throw new KiteError("Unexpected approval link from Kite", 502);
  return { requestId: d.request_id, approvalUrl: d.approval_url };
}

export type SendState = "pending" | "approved" | "completed" | "failed" | "expired";

export interface SendStatus { state: SendState; txHash?: string; error?: string; raw: Record<string, unknown> }

const pick = (o: Record<string, unknown>, ...keys: string[]) => {
  for (const k of keys) if (typeof o[k] === "string" && o[k]) return o[k] as string;
  return undefined;
};

export async function sendStatus(jwt: string, requestId: string): Promise<SendStatus> {
  const d = await call<Record<string, unknown>>(`/v2/wallets/send/approval/check?request_id=${encodeURIComponent(requestId)}`, { jwt });
  const s = String(d.status || "pending").toLowerCase();
  const txHash = pick(d, "transaction_hash", "tx_hash", "hash");
  const error = pick(d, "error", "failure_reason", "reason");
  let state: SendState = "pending";
  if (txHash || ["success", "completed", "sent", "executed"].includes(s)) state = "completed";
  else if (["approved", "executing", "submitted", "processing"].includes(s)) state = "approved";
  else if (["failed", "error", "rejected", "denied", "cancelled"].includes(s) || error) state = "failed";
  else if (s === "expired") state = "expired";
  return { state, txHash, error, raw: d };
}
