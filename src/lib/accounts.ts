import crypto from "crypto";
import { sameAddress, type WalletKind } from "./signatures";
import { collection } from "./store";

/**
 * A Plot Twist account is a Kite Passport login. Wallets get linked to it by signing a message
 * (or by claiming a gift while signed in), so gifts received on those wallets show in the Dashboard.
 */
export interface LinkedWallet { address: string; kind: WalletKind; linkedAt: string }
interface Account { id: string; email: string; wallets: LinkedWallet[] }

const accounts = collection<Account>("accounts");

export async function walletsOf(id: string) {
  return (await accounts.get(id))?.wallets ?? [];
}

export async function linkWallet(id: string, email: string, address: string, kind: WalletKind) {
  const wallet = { address, kind, linkedAt: new Date().toISOString() };
  const updated = await accounts.update(id, (a) =>
    a.wallets.some((w) => sameAddress(w.address, address)) ? null : { ...a, wallets: [...a.wallets, wallet] },
  );
  if (!updated && !(await accounts.get(id))) await accounts.put(id, { id, email, wallets: [wallet] });
  return walletsOf(id);
}

export async function unlinkWallet(id: string, address: string) {
  await accounts.update(id, (a) => ({ ...a, wallets: a.wallets.filter((w) => !sameAddress(w.address, address)) }));
  return walletsOf(id);
}

/** Bound to this session and address, so a signature can't be replayed elsewhere. */
export function linkNonce(sessionId: string, address: string) {
  return crypto.createHmac("sha256", process.env.SESSION_SECRET || "").update(`${sessionId}:${address}`).digest("hex").slice(0, 16);
}

export const linkMessage = (email: string, address: string, nonce: string) =>
  `Link this wallet to my Plot Twist account (${email}).\nWallet: ${address}\nNonce: ${nonce}`;
