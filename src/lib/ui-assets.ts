import type { NetworkId } from "./chains";

/** Logos and wallet lists for the UI (official files in /public/assets/tokens). */
export const TOKEN_LOGO = { USDC: "/assets/tokens/usdc.svg", USDG: "/assets/tokens/usdg_tw.png" } as const;

export const WALLETS = {
  "metamask": {
    "name": "MetaMask",
    "icon": "/assets/tokens/w_metamask.svg",
    "pad": true
  },
  "walletconnect": {
    "name": "WalletConnect",
    "icon": "/assets/tokens/w_walletconnect.svg",
    "pad": true
  },
  "coinbase": {
    "name": "Coinbase Wallet",
    "icon": "/assets/tokens/w_coinbase.svg"
  },
  "trust": {
    "name": "Trust Wallet",
    "icon": "/assets/tokens/w_trust.svg"
  },
  "phantom": {
    "name": "Phantom",
    "icon": "/assets/tokens/w_phantom.svg"
  },
  "solflare": {
    "name": "Solflare",
    "icon": "/assets/tokens/w_solflare.svg"
  }
} as const;

export type WalletKey = keyof typeof WALLETS;

export const CHAIN_UI: Record<NetworkId, { logo: string; explorer: string; issuer: string; wallets: WalletKey[] }> = {
  "base": {
    "logo": "/assets/tokens/chain_base.png",
    "explorer": "BaseScan",
    "issuer": "Circle",
    "wallets": [
      "metamask",
      "coinbase",
      "trust"
    ]
  },
  "solana": {
    "logo": "/assets/tokens/chain_sol.png",
    "explorer": "Solscan",
    "issuer": "Circle",
    "wallets": [
      "phantom",
      "solflare",
      "trust"
    ]
  },
  "polygon": {
    "logo": "/assets/tokens/chain_polygon.png",
    "explorer": "PolygonScan",
    "issuer": "Circle",
    "wallets": [
      "metamask",
      "coinbase",
      "trust"
    ]
  },
  "avalanche": {
    "logo": "/assets/tokens/chain_avax.png",
    "explorer": "Snowtrace",
    "issuer": "Circle",
    "wallets": [
      "metamask",
      "coinbase",
      "trust"
    ]
  },
  "arc": {
    "logo": "/assets/tokens/arc_256.png",
    "explorer": "Arc explorer",
    "issuer": "Circle",
    "wallets": [
      "metamask",
      "coinbase",
      "trust"
    ]
  },
  "tempo": {
    "logo": "/assets/tokens/tempo_touch.png",
    "explorer": "Tempo explorer",
    "issuer": "Circle",
    "wallets": [
      "metamask",
      "coinbase",
      "trust"
    ]
  },
  "robinhood": {
    "logo": "/assets/tokens/rh_152.png",
    "explorer": "Robinhood Chain explorer",
    "issuer": "Paxos",
    "wallets": [
      "metamask",
      "coinbase",
      "trust"
    ]
  }
};
