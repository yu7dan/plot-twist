import type { NextRequest } from "next/server";
import { z } from "zod";
import { NETWORKS } from "@/lib/chains";
import { reclaimGift, ReclaimError } from "@/lib/gifts";
import { getKite } from "@/lib/session";

const bodySchema = z.object({ to: z.string().trim().max(64).optional() });

/** The sender takes back an unclaimed gift after its window. No `to` means their own Kite wallet. */
export async function POST(request: NextRequest, ctx: RouteContext<"/api/gifts/[code]/reclaim">) {
  const { code } = await ctx.params;
  const kite = await getKite();
  if (!kite) return Response.json({ error: "Connect Kite Passport first" }, { status: 401 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: "Invalid address" }, { status: 400 });
  try {
    const g = await reclaimGift(code, kite.userId || kite.email, parsed.data.to || undefined);
    const txHash = g.reclaim?.txHash ?? g.reclaim?.sent?.hash;
    return Response.json({ status: g.status, to: g.reclaim?.to, txHash, txUrl: txHash ? NETWORKS[g.network].txUrl(txHash) : undefined });
  } catch (e) {
    if (e instanceof ReclaimError) return Response.json({ error: e.message }, { status: e.status });
    console.error("reclaim failed", e);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}
