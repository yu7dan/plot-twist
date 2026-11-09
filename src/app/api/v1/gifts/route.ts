import { z } from "zod";
import { agentAuth, originOf } from "@/lib/agent-auth";
import { NETWORK_ORDER, type NetworkId } from "@/lib/chains";
import { GIFT_MAX, GIFT_MIN } from "@/lib/pricing";
import { createRequest, requestView } from "@/lib/requests";
import { designGift, ServError } from "@/lib/serv";
import { DEFAULT_EXPIRY, EXPIRY_OPTIONS, type ExpiryHours } from "@/lib/types";

const bodySchema = z.object({
  brief: z.string().trim().max(400).optional(),
  recipientName: z.string().trim().min(1).max(40).optional(),
  occasion: z.string().trim().min(1).max(40).optional(),
  amount: z.coerce.number().min(GIFT_MIN).max(GIFT_MAX).optional(),
  network: z.enum(NETWORK_ORDER as [string, ...string[]]).optional(),
  note: z.string().trim().min(1).max(160).optional(),
  expiresInHours: z.coerce.number().refine((h) => (EXPIRY_OPTIONS as readonly number[]).includes(h)).default(DEFAULT_EXPIRY),
}).refine((b) => (b.brief && b.brief.length >= 8) || (b.recipientName && b.amount && b.note), { message: "Send a brief, or recipientName, amount and note" });

/** An agent prepares a gift. It waits at `approveUrl` until the account owner approves it with Kite. */
export async function POST(request: Request) {
  const key = await agentAuth(request);
  if (key instanceof Response) return key;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  const b = parsed.data;
  try {
    // SERV fills in whatever the agent didn't specify.
    const d = b.brief ? await designGift(b.brief) : null;
    const r = await createRequest(key, {
      kind: "gift",
      brief: b.brief ?? "",
      expiresInHours: b.expiresInHours as ExpiryHours,
      gift: {
        recipientName: b.recipientName ?? d!.recipientName,
        occasion: b.occasion ?? d?.occasion ?? "Just Because",
        amount: (b.amount ?? Number(d!.amount)).toFixed(2),
        network: (b.network ?? (d?.networkFromPrompt ? d.network : "base")) as NetworkId,
        note: b.note ?? d!.note,
      },
    });
    return Response.json(await requestView(r, originOf(request)), { status: 201 });
  } catch (e) {
    console.error("v1 gift failed", e);
    return Response.json({ error: e instanceof ServError ? "SERV couldn't design this gift. Try again, or send the fields yourself." : "Something went wrong" }, { status: 502 });
  }
}
