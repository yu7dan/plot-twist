import type { NextRequest } from "next/server";
import { getGift, refreshPayment } from "@/lib/gifts";
import { getKite } from "@/lib/session";

/** The sender's app polls this after opening the Kite approval page. */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/gifts/[code]/payment">) {
  const { code } = await ctx.params;
  const kite = await getKite();
  const gift = await getGift(code);
  if (!gift || !kite || gift.ownerId !== (kite.userId || kite.email)) return Response.json({ error: "Gift not found" }, { status: 404 });
  try {
    const g = await refreshPayment(kite.jwt, gift);
    return Response.json({ status: g.status, txHash: g.payment.txHash, error: g.payment.error });
  } catch (e) {
    console.error("payment check failed", e);
    return Response.json({ status: gift.status });
  }
}
