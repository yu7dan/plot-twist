import type { NextRequest } from "next/server";
import { getGift } from "@/lib/gifts";
import { rateLimit } from "@/lib/rate-limit";
import { toPublicGift } from "@/lib/types";

/** The recipient's view of a gift. */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/gifts/[code]">) {
  const limited = await rateLimit("giftRead");
  if (limited) return limited;
  const { code } = await ctx.params;
  const gift = await getGift(code);
  if (!gift || gift.status === "awaiting_payment" || gift.status === "payment_failed") {
    return Response.json({ error: "Gift not found" }, { status: 404 });
  }
  return Response.json(toPublicGift(gift));
}
