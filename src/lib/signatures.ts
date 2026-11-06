import crypto from "crypto";
import bs58 from "bs58";
import { createPublicClient, getAddress, http, isAddress, verifyMessage } from "viem";
import { NETWORKS, type NetworkId } from "./chains";

export type WalletKind = "evm" | "solana";

export function validAddress(kind: WalletKind, address: string) {
  if (kind === "evm") return isAddress(address);
  try {
    return bs58.decode(address).length === 32;
  } catch {
    return false;
  }
}

/** Same wallet, same key: EVM addresses compare case-insensitively, Solana ones exactly. */
export const sameAddress = (a: string, b: string) => (a.startsWith("0x") ? a.toLowerCase() === b.toLowerCase() : a === b);

/** Checks a signed plain-text message: personal_sign for EVM (incl. smart wallets), ed25519 for Solana. */
export async function verifySignature(kind: WalletKind, address: string, message: string, signature: string, network: NetworkId = "base") {
  if (!validAddress(kind, address)) return false;
  if (kind === "solana") {
    try {
      const key = crypto.createPublicKey({ key: { kty: "OKP", crv: "Ed25519", x: Buffer.from(bs58.decode(address)).toString("base64url") }, format: "jwk" });
      return crypto.verify(null, Buffer.from(message), key, Buffer.from(bs58.decode(signature)));
    } catch {
      return false;
    }
  }
  const args = { address: getAddress(address), message, signature: signature as `0x${string}` };
  if (await verifyMessage(args).catch(() => false)) return true;
  // Smart-contract wallets (ERC-1271 / ERC-6492) need the chain.
  const transport = http(process.env[`RPC_${network.toUpperCase()}`] || undefined);
  return createPublicClient({ chain: NETWORKS[network].chain, transport }).verifyMessage(args).catch(() => false);
}
