import type { NextRequest } from "next/server";
import { getDrop, refreshDrop } from "@/lib/drops";
import { getKite } from "@/lib/session";

/** Polled while the sender approves the Drop's single transfer on Kite. */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/drops/[id]/payment">) {
  const { id } = await ctx.params;
  const kite = await getKite();
  const drop = await getDrop(id);
  if (!drop || !kite || drop.ownerId !== (kite.userId || kite.email)) return Response.json({ error: "Drop not found" }, { status: 404 });
  try {
    const d = await refreshDrop(kite.jwt, drop);
    return Response.json({ status: d.status, txHash: d.payment.txHash, error: d.payment.error });
  } catch (e) {
    console.error("drop payment check failed", e);
    return Response.json({ status: drop.status });
  }
}
