import "server-only";
import crypto from "crypto";
import { Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import bs58 from "bs58";
import {
  createPublicClient,
  createWalletClient,
  erc20Abi,
  getAddress,
  http,
  parseEventLogs,
  parseUnits,
  type Address,
  type Hash,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { NETWORKS, type NetworkId } from "./chains";
import { key, redis, sleep } from "./redis";

/**
 * Platform wallets. Each gift is paid into the platform address on its network
 * and paid out to the recipient from the same address, on the same network.
 * v1 uses hot wallets; keep only small balances on them.
 */
const SOLANA_RPC = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";

function evmAccount() {
  const key = process.env.PLATFORM_EVM_KEY as `0x${string}` | undefined;
  if (!key) throw new Error("PLATFORM_EVM_KEY is not set");
  return privateKeyToAccount(key);
}

function solanaKeypair() {
  const key = process.env.PLATFORM_SOLANA_KEY;
  if (!key) throw new Error("PLATFORM_SOLANA_KEY is not set");
  return Keypair.fromSecretKey(bs58.decode(key));
}

const rpcUrl = (id: NetworkId) => process.env[`RPC_${id.toUpperCase()}`] || undefined;

function evmClients(id: NetworkId) {
  const chain = NETWORKS[id].chain!;
  const transport = http(rpcUrl(id));
  return {
    pub: createPublicClient({ chain, transport }),
    wallet: createWalletClient({ chain, transport, account: evmAccount() }),
  };
}

export function platformAddress(id: NetworkId): string {
  return NETWORKS[id].kind === "solana" ? solanaKeypair().publicKey.toBase58() : evmAccount().address;
}

/* ---------- incoming: confirm the sender's transfer landed ---------- */

/** `pending`: not visible yet, check again later. `ok: false` without pending is final. */
export interface Incoming { ok: boolean; pending?: boolean; reason?: string }

/** Checks a transfer of at least `amount` of the gift asset from `from` into the platform address. */
export async function verifyIncoming(id: NetworkId, txHash: string, amount: string, from: string): Promise<Incoming> {
  const net = NETWORKS[id];
  const want = parseUnits(amount, net.asset.decimals);
  if (net.kind === "solana") {
    const conn = new Connection(SOLANA_RPC, "confirmed");
    const tx = await conn.getParsedTransaction(txHash, { maxSupportedTransactionVersion: 0, commitment: "confirmed" });
    if (!tx) return { ok: false, pending: true };
    const meta = tx.meta;
    if (!meta || meta.err) return { ok: false, reason: "Transaction failed" };
    const owner = platformAddress(id);
    const bal = (list: typeof meta.postTokenBalances, who: string) =>
      BigInt(list?.find((b) => b.mint === net.asset.address && b.owner === who)?.uiTokenAmount.amount ?? "0");
    const received = bal(meta.postTokenBalances, owner) - bal(meta.preTokenBalances, owner);
    const sent = bal(meta.preTokenBalances, from) - bal(meta.postTokenBalances, from);
    if (received < want || sent < want) return { ok: false, reason: "Amount or sender does not match" };
    return { ok: true };
  }
  const { pub } = evmClients(id);
  const receipt = await pub.getTransactionReceipt({ hash: txHash as Hash }).catch(() => null);
  if (!receipt) return { ok: false, pending: true };
  if (receipt.status !== "success") return { ok: false, reason: "Transaction reverted" };
  const to = getAddress(platformAddress(id));
  const logs = parseEventLogs({ abi: erc20Abi, eventName: "Transfer", logs: receipt.logs }).filter(
    (l) => getAddress(l.address) === getAddress(net.asset.address) && getAddress(l.args.to) === to && getAddress(l.args.from) === getAddress(from),
  );
  const received = logs.reduce((s, l) => s + l.args.value, BigInt(0));
  if (received < want) return { ok: false, reason: "Amount or sender does not match" };
  return { ok: true };
}

/* ---------- outgoing: pay the recipient ---------- */

/**
 * Why a pasted payout address would lose the money, or null if it looks fine. Pasted addresses aren't
 * signed for, so catch the costly mistakes: our own address, the token contract, or a Solana token
 * account (we'd create a token account owned by a token account, which nobody can spend from).
 */
export async function payoutAddressProblem(id: NetworkId, address: string): Promise<string | null> {
  const net = NETWORKS[id];
  if (net.kind === "solana") {
    if (address === platformAddress(id) || address === net.asset.address) return "That address can't receive this gift";
    const info = await new Connection(SOLANA_RPC, "confirmed").getAccountInfo(new PublicKey(address));
    const tokenPrograms = ["TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"];
    if (info && tokenPrograms.includes(info.owner.toBase58())) return "That's a token account. Paste your wallet address instead";
    return null;
  }
  const a = getAddress(address);
  if (a === getAddress(platformAddress(id)) || a === getAddress(net.asset.address) || /^0x0{40}$/i.test(a)) return "That address can't receive this gift";
  return null;
}

/**
 * A broadcast payout. Saved on the gift right away so a timeout or crash can never lead to paying twice:
 * the gift stays "claiming"/"reclaiming" until `payoutStatus` settles it.
 */
export interface SentPayout { hash: string; sentAt: string; nonce?: number; lastValidBlockHeight?: number }

// One send at a time per network, so concurrent payouts never reuse an EVM nonce.
// Production: a Redis lock shared by every instance. Local dev: an in-process queue.
const g = globalThis as unknown as { __ptSendLocks?: Map<NetworkId, Promise<unknown>> };
const locks = (g.__ptSendLocks ??= new Map());
function serialLocal<T>(id: NetworkId, fn: () => Promise<T>): Promise<T> {
  const next = (locks.get(id) ?? Promise.resolve()).then(fn, fn);
  locks.set(id, next.catch(() => undefined));
  return next;
}

const UNLOCK = `if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) end return 0`;

async function serial<T>(id: NetworkId, fn: () => Promise<T>): Promise<T> {
  const db = redis();
  if (!db) return serialLocal(id, fn);
  const k = key("lock", "send", id);
  const token = crypto.randomUUID();
  const until = Date.now() + 40_000;
  // The TTL only matters if an instance dies mid-send; a send takes a few seconds.
  while ((await db.set(k, token, { nx: true, px: 30_000 })) !== "OK") {
    if (Date.now() > until) throw new Error(`payouts on ${id} are busy`); // nothing was broadcast
    await sleep(250);
  }
  try {
    return await fn();
  } finally {
    await db.eval(UNLOCK, [k], [token]).catch(() => undefined);
  }
}

/** Signs and broadcasts; throws only if nothing was broadcast. */
export function sendPayout(id: NetworkId, to: string, amount: string): Promise<SentPayout> {
  const net = NETWORKS[id];
  const value = parseUnits(amount, net.asset.decimals);
  return serial(id, async () => {
    if (net.kind === "solana") {
      const conn = new Connection(SOLANA_RPC, "confirmed");
      const payer = solanaKeypair();
      const mint = new PublicKey(net.asset.address);
      const owner = new PublicKey(to);
      const toAta = getAssociatedTokenAddressSync(mint, owner, true);
      const tx = new Transaction().add(
        // The platform pays the recipient's token-account rent if they don't have one yet.
        createAssociatedTokenAccountIdempotentInstruction(payer.publicKey, toAta, owner, mint),
        createTransferCheckedInstruction(getAssociatedTokenAddressSync(mint, payer.publicKey), mint, toAta, payer.publicKey, value, net.asset.decimals),
      );
      const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = payer.publicKey;
      tx.sign(payer);
      const hash = await conn.sendRawTransaction(tx.serialize());
      return { hash, sentAt: new Date().toISOString(), lastValidBlockHeight };
    }
    const { pub, wallet } = evmClients(id);
    const nonce = await pub.getTransactionCount({ address: evmAccount().address, blockTag: "pending" });
    const hash = await wallet.writeContract({ address: net.asset.address as Address, abi: erc20Abi, functionName: "transfer", args: [getAddress(to), value], nonce });
    return { hash, sentAt: new Date().toISOString(), nonce };
  });
}

/** `failed` only when the payout can provably never land, so the gift can safely be paid again. */
export async function payoutStatus(id: NetworkId, p: SentPayout): Promise<"success" | "failed" | "pending"> {
  const net = NETWORKS[id];
  if (net.kind === "solana") {
    const conn = new Connection(SOLANA_RPC, "confirmed");
    const st = (await conn.getSignatureStatus(p.hash, { searchTransactionHistory: true })).value;
    if (st?.err) return "failed";
    if (st && (st.confirmationStatus === "confirmed" || st.confirmationStatus === "finalized")) return "success";
    // Never seen and its blockhash has expired: it was dropped.
    if (!st && p.lastValidBlockHeight && (await conn.getBlockHeight("confirmed")) > p.lastValidBlockHeight) return "failed";
    return "pending";
  }
  const { pub } = evmClients(id);
  const receipt = await pub.getTransactionReceipt({ hash: p.hash as Hash }).catch(() => null);
  if (receipt) return receipt.status === "success" ? "success" : "failed";
  // No receipt, and another transaction already used its nonce: it can never land.
  if (p.nonce != null && (await pub.getTransactionCount({ address: evmAccount().address, blockTag: "latest" })) > p.nonce) {
    return (await pub.getTransactionReceipt({ hash: p.hash as Hash }).catch(() => null))?.status === "success" ? "success" : "failed";
  }
  return "pending";
}

/** Waits a little for a fresh payout to settle; returns "pending" if it is still in flight. */
export async function settlePayout(id: NetworkId, p: SentPayout, waitMs = 45_000) {
  const until = Date.now() + waitMs;
  for (;;) {
    const st = await payoutStatus(id, p).catch(() => "pending" as const);
    if (st !== "pending" || Date.now() > until) return st;
    await sleep(2500);
  }
}

/** Platform float per network, for the ops check before a demo. */
export async function floats(): Promise<Record<NetworkId, string>> {
  const out = {} as Record<NetworkId, string>;
  await Promise.all(
    (Object.keys(NETWORKS) as NetworkId[]).map(async (id) => {
      const net = NETWORKS[id];
      try {
        if (net.kind === "solana") {
          const conn = new Connection(SOLANA_RPC, "confirmed");
          const ata = getAssociatedTokenAddressSync(new PublicKey(net.asset.address), solanaKeypair().publicKey);
          out[id] = (await conn.getTokenAccountBalance(ata)).value.uiAmountString ?? "0";
        } else {
          const { pub } = evmClients(id);
          const raw = await pub.readContract({ address: net.asset.address as Address, abi: erc20Abi, functionName: "balanceOf", args: [evmAccount().address] });
          out[id] = (Number(raw) / 10 ** net.asset.decimals).toFixed(2);
        }
      } catch {
        out[id] = "n/a";
      }
    }),
  );
  return out;
}
