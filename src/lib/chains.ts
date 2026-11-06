import type { Chain } from "viem";
import { arc, avalanche, base, polygon, robinhood, tempo } from "viem/chains";

/** The seven networks Kite Passport holds stablecoins on. One gift lives on exactly one of them. */
export type NetworkId = "base" | "solana" | "polygon" | "avalanche" | "arc" | "tempo" | "robinhood";

export interface Network {
  id: NetworkId;
  name: string;
  kind: "evm" | "solana";
  /** viem chain for EVM networks. */
  chain?: Chain;
  /** The stablecoin a gift on this network is made of (Kite's symbol for it). */
  asset: { symbol: "USDC" | "USDG"; name: string; address: string; decimals: number };
  txUrl: (hash: string) => string;
  /** Wallets usually need to add these networks once. */
  isNew?: boolean;
}

export const NETWORK_ORDER: NetworkId[] = ["base", "solana", "polygon", "avalanche", "arc", "tempo", "robinhood"];

// Token addresses verified on-chain (symbol / decimals) on 2026-11-05.
export const NETWORKS: Record<NetworkId, Network> = {
  base: {
    id: "base", name: "Base", kind: "evm", chain: base,
    asset: { symbol: "USDC", name: "USD Coin", address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", decimals: 6 },
    txUrl: (h) => `https://basescan.org/tx/${h}`,
  },
  solana: {
    id: "solana", name: "Solana", kind: "solana",
    asset: { symbol: "USDC", name: "USD Coin", address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", decimals: 6 },
    txUrl: (h) => `https://solscan.io/tx/${h}`,
  },
  polygon: {
    id: "polygon", name: "Polygon", kind: "evm", chain: polygon,
    asset: { symbol: "USDC", name: "USD Coin", address: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", decimals: 6 },
    txUrl: (h) => `https://polygonscan.com/tx/${h}`,
  },
  avalanche: {
    id: "avalanche", name: "Avalanche", kind: "evm", chain: avalanche,
    asset: { symbol: "USDC", name: "USD Coin", address: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E", decimals: 6 },
    txUrl: (h) => `https://snowtrace.io/tx/${h}`,
  },
  arc: {
    id: "arc", name: "Arc", kind: "evm", chain: arc, isNew: true,
    asset: { symbol: "USDC", name: "USD Coin", address: "0x3600000000000000000000000000000000000000", decimals: 6 },
    txUrl: (h) => `https://explorer.arc.io/tx/${h}`,
  },
  tempo: {
    // Kite surfaces Tempo's bridged USDC.e as USDC.
    id: "tempo", name: "Tempo", kind: "evm", chain: tempo, isNew: true,
    asset: { symbol: "USDC", name: "Bridged USDC", address: "0x20C000000000000000000000b9537d11c60E8b50", decimals: 6 },
    txUrl: (h) => `https://explore.tempo.xyz/tx/${h}`,
  },
  robinhood: {
    id: "robinhood", name: "Robinhood Chain", kind: "evm", chain: robinhood, isNew: true,
    asset: { symbol: "USDG", name: "Global Dollar", address: "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168", decimals: 6 },
    txUrl: (h) => `https://robinhoodchain.blockscout.com/tx/${h}`,
  },
};

export const isNetworkId = (v: unknown): v is NetworkId => typeof v === "string" && v in NETWORKS;
