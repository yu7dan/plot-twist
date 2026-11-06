import { z } from "zod";
import { NETWORK_ORDER, NETWORKS, type NetworkId } from "@/lib/chains";
import { KiteError, sendStatus, startSend } from "@/lib/kite";
import { getKite } from "@/lib/session";
import { validAddress } from "@/lib/signatures";

const bodySchema = z.object({
  network: z.enum(NETWORK_ORDER as [NetworkId, ...NetworkId[]]),
  to: z.string().trim().min(32).max(64),
  amount: z.string().regex(/^\d+(\.\d{1,6})?$/),
});

/** Move money out of Kite to a wallet of the user's choice. Kite asks for their passkey, as for every transfer. */
export async function POST(request: Request) {
  const kite = await getKite();
  if (!kite) return Response.json({ error: "Connect Kite Passport first" }, { status: 401 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !(Number(parsed.data.amount) > 0)) return Response.json({ error: "Check the amount and address" }, { status: 400 });
  const { network, to, amount } = parsed.data;
  if (!validAddress(NETWORKS[network].kind, to)) return Response.json({ error: `That isn't a ${NETWORKS[network].name} address` }, { status: 400 });
  try {
    return Response.json(await startSend(kite.jwt, { network, to, amount }));
  } catch (e) {
    if (e instanceof KiteError && e.status < 500) return Response.json({ error: e.message }, { status: e.status });
    console.error("withdraw failed", e);
    return Response.json({ error: "Kite is unavailable right now" }, { status: 502 });
  }
}

/** Polled after the passkey approval opens. */
export async function GET(request: Request) {
  const kite = await getKite();
  if (!kite) return Response.json({ error: "Connect Kite Passport first" }, { status: 401 });
  const requestId = new URL(request.url).searchParams.get("requestId");
  if (!requestId) return Response.json({ error: "Missing requestId" }, { status: 400 });
  try {
    const s = await sendStatus(kite.jwt, requestId);
    return Response.json({ state: s.state, txHash: s.txHash, error: s.error });
  } catch {
    return Response.json({ state: "pending" });
  }
}
