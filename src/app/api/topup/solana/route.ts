import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { parseUnits } from "viem";
import { z } from "zod";
import { NETWORKS } from "@/lib/chains";
import { me } from "@/lib/kite";
import { getKite } from "@/lib/session";

const bodySchema = z.object({ from: z.string().min(32).max(64), amount: z.string().regex(/^\d+(\.\d{1,6})?$/) });

/**
 * Builds an unsigned USDC transfer from the sender's own Solana wallet to their Kite Passport address.
 * The wallet signs and sends it; the destination is always the signed-in user's own Kite wallet.
 */
export async function POST(request: Request) {
  const kite = await getKite();
  if (!kite) return Response.json({ error: "Connect Kite Passport first" }, { status: 401 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid top-up" }, { status: 400 });
  try {
    const kiteAddress = (await me(kite.jwt)).wallets.find((w) => w.chain === "solana")?.address;
    if (!kiteAddress) return Response.json({ error: "Your Kite Passport has no Solana address" }, { status: 400 });
    const usdc = NETWORKS.solana.asset;
    const mint = new PublicKey(usdc.address);
    const from = new PublicKey(parsed.data.from);
    const to = new PublicKey(kiteAddress);
    const toAta = getAssociatedTokenAddressSync(mint, to, true);
    const tx = new Transaction().add(
      createAssociatedTokenAccountIdempotentInstruction(from, toAta, to, mint),
      createTransferCheckedInstruction(getAssociatedTokenAddressSync(mint, from), mint, toAta, from, parseUnits(parsed.data.amount, usdc.decimals), usdc.decimals),
    );
    const conn = new Connection(process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com", "confirmed");
    tx.recentBlockhash = (await conn.getLatestBlockhash()).blockhash;
    tx.feePayer = from;
    return Response.json({ transaction: tx.serialize({ requireAllSignatures: false }).toString("base64"), to: kiteAddress });
  } catch (e) {
    console.error("solana top-up build failed", e);
    return Response.json({ error: "Couldn't prepare the transfer" }, { status: 502 });
  }
}
