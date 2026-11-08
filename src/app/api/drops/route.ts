import { z } from "zod";
import { NETWORK_ORDER, type NetworkId } from "@/lib/chains";
import { createDrop } from "@/lib/drops";
import { KiteError } from "@/lib/kite";
import { DROP_EACH_MAX, DROP_EACH_MIN, DROP_MAX_PEOPLE, DROP_MAX_TOTAL } from "@/lib/pricing";
import { getKite } from "@/lib/session";
import { DEFAULT_EXPIRY, EXPIRY_OPTIONS, type ExpiryHours } from "@/lib/types";

const bodySchema = z.object({
  prompt: z.string().max(8000).default(""),
  title: z.string().trim().min(1).max(60),
  occasion: z.string().trim().min(1).max(40),
  network: z.enum(NETWORK_ORDER as [string, ...string[]]),
  expiresInHours: z.coerce.number().refine((h) => (EXPIRY_OPTIONS as readonly number[]).includes(h)).default(DEFAULT_EXPIRY),
  recipients: z.array(z.object({
    name: z.string().trim().min(1).max(40),
    contact: z.string().trim().max(60).optional(),
    amount: z.coerce.number().min(DROP_EACH_MIN).max(DROP_EACH_MAX),
    note: z.string().trim().min(1).max(200),
  })).min(1).max(DROP_MAX_PEOPLE),
});

/** Create a Drop: returns the one Kite approval link that pays for every person on it. */
export async function POST(request: Request) {
  const kite = await getKite();
  if (!kite) return Response.json({ error: "Connect Kite Passport first" }, { status: 401 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Check the names, amounts and notes" }, { status: 400 });
  const p = parsed.data;
  const sum = p.recipients.reduce((s, r) => s + r.amount, 0);
  if (sum > DROP_MAX_TOTAL) return Response.json({ error: `A Drop can send up to $${DROP_MAX_TOTAL.toLocaleString("en-US")}` }, { status: 400 });
  try {
    const drop = await createDrop(kite.jwt, kite.userId || kite.email, {
      ...p,
      network: p.network as NetworkId,
      expiresInHours: p.expiresInHours as ExpiryHours,
      senderName: kite.email.split("@")[0],
      recipients: p.recipients.map((r) => ({ ...r, amount: Math.round(r.amount * 100) / 100 })),
    });
    return Response.json({ id: drop.id, approvalUrl: drop.payment.approvalUrl });
  } catch (e) {
    console.error("create drop failed", e);
    if (e instanceof KiteError && e.status < 500) return Response.json({ error: e.message }, { status: e.status });
    return Response.json({ error: "Couldn't start the payment. Please try again." }, { status: 502 });
  }
}
