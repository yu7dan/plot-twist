import type { NextRequest } from "next/server";
import { z } from "zod";
import { NETWORKS } from "@/lib/chains";
import { ClaimError, claimGift } from "@/lib/gifts";
import { rateLimit } from "@/lib/rate-limit";
import { getKite } from "@/lib/session";

const bodySchema = z.object({ address: z.string().min(32).max(64), signature: z.string().min(64).max(4000) });

/** The recipient proves the wallet is theirs (signed message); the platform sends the gift, gas included. */
export async function POST(request: NextRequest, ctx: RouteContext<"/api/gifts/[code]/claim">) {
  const limited = await rateLimit("claim");
  if (limited) return limited;
  const { code } = await ctx.params;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Connect a wallet to claim" }, { status: 400 });
  try {
    const kite = await getKite();
    const account = kite ? { id: kite.userId || kite.email, email: kite.email } : undefined;
    const g = await claimGift(code, parsed.data.address, parsed.data.signature, account);
    // "claiming" means the transfer is broadcast and still confirming.
    const txHash = g.claim?.txHash ?? g.claim?.sent?.hash;
    return Response.json({ status: g.status, txHash, txUrl: txHash ? NETWORKS[g.network].txUrl(txHash) : undefined });
  } catch (e) {
    if (e instanceof ClaimError) return Response.json({ error: e.message }, { status: e.status });
    console.error("claim failed", e);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}
