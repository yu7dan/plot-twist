import type { NextRequest } from "next/server";
import { z } from "zod";
import { DropError, reclaimDrop } from "@/lib/drops";
import { getKite } from "@/lib/session";

const bodySchema = z.object({ to: z.string().trim().max(64).optional() });

/** After the window, takes back everything unclaimed in one transfer. No `to` means the sender's Kite wallet. */
export async function POST(request: NextRequest, ctx: RouteContext<"/api/drops/[id]/reclaim">) {
  const { id } = await ctx.params;
  const kite = await getKite();
  if (!kite) return Response.json({ error: "Connect Kite Passport first" }, { status: 401 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: "Invalid address" }, { status: 400 });
  try {
    return Response.json(await reclaimDrop(id, kite.userId || kite.email, parsed.data.to || undefined));
  } catch (e) {
    if (e instanceof DropError) return Response.json({ error: e.message }, { status: e.status });
    console.error("drop reclaim failed", e);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}
