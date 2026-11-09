import type { NextRequest } from "next/server";
import { originOf } from "@/lib/agent-auth";
import { KiteError } from "@/lib/kite";
import { approveRequest, getRequest, RequestError, requestView } from "@/lib/requests";
import { getKite } from "@/lib/session";

/** What an agent prepared, for its owner to review (and to follow the payment once approved). */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/approve/[id]">) {
  const kite = await getKite();
  if (!kite) return Response.json({ error: "Connect Kite Passport first" }, { status: 401 });
  const r = await getRequest((await ctx.params).id);
  if (!r || r.ownerId !== (kite.userId || kite.email)) return Response.json({ error: "This request belongs to another account" }, { status: 404 });
  return Response.json(await requestView(r, originOf(request), kite.jwt));
}

/** Approve: creates the gift or Drop with the owner's Kite session and returns the passkey approval link. */
export async function POST(request: NextRequest, ctx: RouteContext<"/api/approve/[id]">) {
  const kite = await getKite();
  if (!kite) return Response.json({ error: "Connect Kite Passport first" }, { status: 401 });
  try {
    return Response.json(await approveRequest(kite.jwt, kite.userId || kite.email, kite.email, (await ctx.params).id));
  } catch (e) {
    if (e instanceof RequestError) return Response.json({ error: e.message }, { status: e.status });
    console.error("approve failed", e);
    if (e instanceof KiteError && e.status < 500) return Response.json({ error: e.message }, { status: e.status });
    return Response.json({ error: "Couldn't start the payment. Please try again." }, { status: 502 });
  }
}
