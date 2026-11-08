import type { NextRequest } from "next/server";
import { dropView, getDrop } from "@/lib/drops";
import { getKite } from "@/lib/session";

/** The Drop's page: every person, their link and whether they've claimed. Owner only. */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/drops/[id]">) {
  const { id } = await ctx.params;
  const kite = await getKite();
  const drop = await getDrop(id);
  if (!drop || !kite || drop.ownerId !== (kite.userId || kite.email)) return Response.json({ error: "Drop not found" }, { status: 404 });
  return Response.json(await dropView(drop));
}
