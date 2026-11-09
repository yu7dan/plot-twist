import type { NextRequest } from "next/server";
import { agentAuth, originOf } from "@/lib/agent-auth";
import { getRequest, requestView } from "@/lib/requests";

/** Status of a prepared Drop: pending_approval → awaiting_payment → live (each person's link). */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/v1/drops/[id]">) {
  const key = await agentAuth(request);
  if (key instanceof Response) return key;
  const r = await getRequest((await ctx.params).id);
  if (!r || r.ownerId !== key.ownerId || r.kind !== "drop") return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(await requestView(r, originOf(request)));
}
