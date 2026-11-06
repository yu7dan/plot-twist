import { isNetworkId, type NetworkId } from "@/lib/chains";
import { balances, KiteError, me } from "@/lib/kite";
import { clearKite, getKite } from "@/lib/session";

/** Who is connected, how much they can gift on each network, and their Kite deposit addresses (for top-ups). */
export async function GET() {
  const kite = await getKite();
  if (!kite) return Response.json({ connected: false });
  try {
    const [b, profile] = await Promise.all([balances(kite.jwt), me(kite.jwt)]);
    const addresses: Partial<Record<NetworkId, string>> = {};
    for (const w of profile.wallets) if (isNetworkId(w.chain)) addresses[w.chain] = w.address;
    return Response.json({ connected: true, email: kite.email, total: b.total, balances: b.byNetwork, addresses, passkey: profile.passkey_readiness ?? null });
  } catch (e) {
    if (e instanceof KiteError && e.status === 401) {
      await clearKite();
      return Response.json({ connected: false });
    }
    console.error("kite me failed", e);
    return Response.json({ error: "Kite is unavailable right now" }, { status: 502 });
  }
}
