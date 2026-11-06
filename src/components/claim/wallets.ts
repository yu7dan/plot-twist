"use client";

import bs58 from "bs58";
import { encodeFunctionData, erc20Abi, parseUnits, toHex } from "viem";
import { NETWORKS, type NetworkId } from "@/lib/chains";
import type { WalletKey } from "@/lib/ui-assets";

/**
 * Minimal wallet access (claim, wallet linking, Kite top-ups): no SDKs, just the providers wallets inject.
 * On phones without the wallet's browser we deep-link into its in-app browser instead.
 */

interface Eip1193 { request: (a: { method: string; params?: unknown[] | object }) => Promise<unknown> }
interface SolanaProvider {
  connect: () => Promise<{ publicKey: { toString(): string } }>;
  signMessage: (msg: Uint8Array, enc?: string) => Promise<{ signature: Uint8Array } | Uint8Array>;
  signAndSendTransaction: (tx: unknown) => Promise<{ signature: string } | string>;
  publicKey?: { toString(): string };
}

type W = Window & {
  ethereum?: Eip1193 & { isMetaMask?: boolean; isCoinbaseWallet?: boolean; providers?: (Eip1193 & { isMetaMask?: boolean; isCoinbaseWallet?: boolean })[] };
  phantom?: { solana?: SolanaProvider };
  solflare?: SolanaProvider & { isSolflare?: boolean };
  trustwallet?: Eip1193 & { solana?: SolanaProvider };
  coinbaseWalletExtension?: Eip1193;
};

const eip6963: { info: { rdns: string }; provider: Eip1193 }[] = [];
if (typeof window !== "undefined") {
  window.addEventListener("eip6963:announceProvider", (e) => eip6963.push((e as CustomEvent).detail));
  window.dispatchEvent(new Event("eip6963:requestProvider"));
}

const RDNS: Partial<Record<WalletKey, string>> = { metamask: "io.metamask", coinbase: "com.coinbase.wallet", trust: "com.trustwallet.app" };

function evmProvider(key: WalletKey): Eip1193 | null {
  const w = window as W;
  const announced = eip6963.find((p) => p.info.rdns === RDNS[key])?.provider;
  if (announced) return announced;
  const list = w.ethereum?.providers ?? (w.ethereum ? [w.ethereum] : []);
  if (key === "metamask") return list.find((p) => p.isMetaMask && !p.isCoinbaseWallet) ?? null;
  if (key === "coinbase") return w.coinbaseWalletExtension ?? list.find((p) => p.isCoinbaseWallet) ?? null;
  if (key === "trust") return (w.trustwallet as Eip1193 | undefined) ?? null;
  return null;
}

function solProvider(key: WalletKey): SolanaProvider | null {
  const w = window as W;
  if (key === "phantom") return w.phantom?.solana ?? null;
  if (key === "solflare") return w.solflare ?? null;
  if (key === "trust") return w.trustwallet?.solana ?? null;
  return null;
}

/** Link that reopens this page inside the wallet's own browser (mobile). */
function deepLink(key: WalletKey, network: NetworkId): string | null {
  const url = window.location.href;
  const host = url.replace(/^https?:\/\//, "");
  const ref = encodeURIComponent(window.location.origin);
  switch (key) {
    case "metamask": return `https://metamask.app.link/dapp/${host}`;
    case "coinbase": return `https://go.cb-w.com/dapp?cb_url=${encodeURIComponent(url)}`;
    case "phantom": return `https://phantom.app/ul/browse/${encodeURIComponent(url)}?ref=${ref}`;
    case "solflare": return `https://solflare.com/ul/v1/browse/${encodeURIComponent(url)}?ref=${ref}`;
    case "trust": return `https://link.trustwallet.com/open_url?coin_id=${NETWORKS[network].kind === "solana" ? 501 : 60}&url=${encodeURIComponent(url)}`;
    default: return null;
  }
}

export class NoWallet extends Error {
  constructor(public link: string | null) {
    super("Wallet not found");
  }
}

export interface Connected {
  key: WalletKey;
  address: string;
  sign: (message: string) => Promise<string>;
  /** Sends `amount` of the network's gift stablecoin to `to` and returns the tx hash / signature. */
  sendStable: (to: string, amount: string) => Promise<string>;
}

export async function connectWallet(key: WalletKey, network: NetworkId): Promise<Connected> {
  if (NETWORKS[network].kind === "solana") {
    const p = solProvider(key);
    if (!p) throw new NoWallet(deepLink(key, network));
    const res = await p.connect();
    const address = res.publicKey.toString();
    return {
      key, address,
      sign: async (message) => {
        const out = await p.signMessage(new TextEncoder().encode(message), "utf8");
        return bs58.encode(out instanceof Uint8Array ? out : out.signature);
      },
      sendStable: async (_to, amount) => {
        // The server builds the transfer (always to the user's own Kite address); the wallet signs and sends it.
        const r = await fetch("/api/topup/solana", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ from: address, amount }) });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Couldn't prepare the transfer");
        const { Transaction } = await import("@solana/web3.js");
        const out = await p.signAndSendTransaction(Transaction.from(Uint8Array.from(atob(d.transaction), (c) => c.charCodeAt(0))));
        return typeof out === "string" ? out : out.signature;
      },
    };
  }
  const p = evmProvider(key);
  if (!p) throw new NoWallet(deepLink(key, network));
  const [address] = (await p.request({ method: "eth_requestAccounts" })) as string[];
  return {
    key, address,
    sign: async (message) => (await p.request({ method: "personal_sign", params: [toHex(message), address] })) as string,
    sendStable: async (to, amount) => {
      const net = NETWORKS[network];
      await switchTo(p, network);
      const data = encodeFunctionData({ abi: erc20Abi, functionName: "transfer", args: [to as `0x${string}`, parseUnits(amount, net.asset.decimals)] });
      return (await p.request({ method: "eth_sendTransaction", params: [{ from: address, to: net.asset.address, data }] })) as string;
    },
  };
}

/** After claiming: add the network (if needed) and the token, so the gift shows up in the wallet. */
export async function showInWallet(key: WalletKey, network: NetworkId) {
  const net = NETWORKS[network];
  if (net.kind !== "evm" || !net.chain) return;
  const p = evmProvider(key);
  if (!p) return;
  await switchTo(p, network);
  await p.request({
    method: "wallet_watchAsset",
    params: { type: "ERC20", options: { address: net.asset.address, symbol: net.asset.symbol, decimals: net.asset.decimals } },
  }).catch(() => undefined);
}

/** Switches the wallet to the network, adding it first if the wallet doesn't know it yet. */
async function switchTo(p: Eip1193, network: NetworkId) {
  const net = NETWORKS[network];
  if (!net.chain) return;
  const chainId = toHex(net.chain.id);
  try {
    await p.request({ method: "wallet_switchEthereumChain", params: [{ chainId }] });
  } catch {
    await p.request({
      method: "wallet_addEthereumChain",
      params: [{
        chainId,
        chainName: net.chain.name,
        nativeCurrency: net.chain.nativeCurrency,
        rpcUrls: net.chain.rpcUrls.default.http,
        blockExplorerUrls: net.chain.blockExplorers ? [net.chain.blockExplorers.default.url] : undefined,
      }],
    });
  }
}
