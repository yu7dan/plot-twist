import { getKite } from "@/lib/session";
import { developerStats } from "@/lib/usage";

/** The Developers view: API usage, keys and recent agent requests for the signed-in account. */
export async function GET(request: Request) {
  const kite = await getKite();
  if (!kite) return Response.json({ error: "Connect Kite Passport first" }, { status: 401 });
  const days = [7, 30, 90].includes(Number(new URL(request.url).searchParams.get("days"))) ? Number(new URL(request.url).searchParams.get("days")) : 30;
  return Response.json(await developerStats(kite.userId || kite.email, days));
}
