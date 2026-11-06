import { z } from "zod";
import { NETWORK_ORDER } from "@/lib/chains";
import { createGift } from "@/lib/gifts";
import { KiteError } from "@/lib/kite";
import { GIFT_MAX, GIFT_MIN } from "@/lib/pricing";
import { getKite } from "@/lib/session";
import { DEFAULT_EXPIRY, EXPIRY_OPTIONS } from "@/lib/types";

const bodySchema = z.object({
  prompt: z.string().max(400).default(""),
  senderName: z.string().trim().max(40).default(""),
  recipientName: z.string().trim().min(1).max(40),
  occasion: z.string().trim().min(1).max(40),
  amount: z.coerce.number().min(GIFT_MIN).max(GIFT_MAX),
  network: z.enum(NETWORK_ORDER as [string, ...string[]]),
  note: z.string().trim().min(1).max(200),
  expiresInHours: z.coerce.number().refine((h) => (EXPIRY_OPTIONS as readonly number[]).includes(h)).default(DEFAULT_EXPIRY),
});

/** Create a gift: returns the Kite approval link the sender opens to pay with their passkey. */
export async function POST(request: Request) {
  const kite = await getKite();
  if (!kite) return Response.json({ error: "Connect Kite Passport first" }, { status: 401 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Check the gift details" }, { status: 400 });

  const p = parsed.data;
  try {
    const gift = await createGift(kite.jwt, kite.userId || kite.email, {
      ...p,
      amount: p.amount.toFixed(2),
      network: p.network as (typeof NETWORK_ORDER)[number],
      expiresInHours: p.expiresInHours as (typeof EXPIRY_OPTIONS)[number],
      senderName: p.senderName || kite.email.split("@")[0],
    });
    return Response.json({ code: gift.code, approvalUrl: gift.payment.approvalUrl });
  } catch (e) {
    console.error("create gift failed", e);
    if (e instanceof KiteError && e.status < 500) return Response.json({ error: e.message }, { status: e.status });
    return Response.json({ error: "Couldn't start the payment. Please try again." }, { status: 502 });
  }
}
