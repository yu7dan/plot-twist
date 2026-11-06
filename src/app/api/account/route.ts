import { walletsOf } from "@/lib/accounts";
import { NETWORKS } from "@/lib/chains";
import { giftsOf, receivedBy, reclaimable, refreshPayment } from "@/lib/gifts";
import { balances, KiteError } from "@/lib/kite";
import { clearKite, getKite } from "@/lib/session";

/** Everything the Dashboard shows: account, balances, linked wallets, sent and received gifts. */
export async function GET() {
  const kite = await getKite();
  if (!kite) return Response.json({ connected: false });
  const id = kite.userId || kite.email;
  try {
    const [bal, wallets, mine] = await Promise.all([balances(kite.jwt), walletsOf(id), giftsOf(id)]);
    // Gifts closed before the passkey step get picked up here.
    const sent = await Promise.all(mine.map((g) => (g.status === "awaiting_payment" ? refreshPayment(kite.jwt, g).catch(() => g) : g)));
    const received = await receivedBy(id, wallets);
    return Response.json({
      connected: true,
      email: kite.email,
      total: bal.total,
      balances: bal.byNetwork,
      wallets,
      sent: sent.map((g) => ({
        code: g.code, createdAt: g.createdAt, recipientName: g.recipientName, occasion: g.occasion,
        amount: g.amount, network: g.network, status: g.status, claimedAt: g.claim?.claimedAt, expiresAt: g.expiresAt,
        reclaimable: reclaimable(g), reclaimTo: g.payment.from, reclaimTxUrl: g.reclaim?.txHash ? NETWORKS[g.network].txUrl(g.reclaim.txHash) : undefined,
      })),
      received: received.map((g) => ({
        code: g.code, senderName: g.senderName, occasion: g.occasion, amount: g.amount, network: g.network, note: g.note,
        claimedAt: g.claim?.claimedAt, address: g.claim?.address, txUrl: g.claim?.txHash ? NETWORKS[g.network].txUrl(g.claim.txHash) : undefined,
      })),
    });
  } catch (e) {
    if (e instanceof KiteError && e.status === 401) {
      await clearKite();
      return Response.json({ connected: false });
    }
    console.error("account failed", e);
    return Response.json({ error: "Kite is unavailable right now" }, { status: 502 });
  }
}
