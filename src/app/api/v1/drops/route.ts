import { z } from "zod";
import { agentAuth, originOf } from "@/lib/agent-auth";
import { NETWORK_ORDER, type NetworkId } from "@/lib/chains";
import { DROP_EACH_MAX, DROP_EACH_MIN, DROP_MAX_PEOPLE, DROP_MAX_TOTAL } from "@/lib/pricing";
import { createRequest, requestView } from "@/lib/requests";
import { recordUsage } from "@/lib/usage";
import { designDrop, ServError } from "@/lib/serv";
import { EXPIRY_OPTIONS, type ExpiryHours } from "@/lib/types";

const bodySchema = z.object({
  brief: z.string().trim().max(4000).default(""),
  title: z.string().trim().min(1).max(60).optional(),
  network: z.enum(NETWORK_ORDER as [string, ...string[]]).optional(),
  expiresInHours: z.coerce.number().refine((h) => (EXPIRY_OPTIONS as readonly number[]).includes(h)).default(168),
  recipients: z.array(z.object({
    name: z.string().trim().min(1).max(40),
    amount: z.coerce.number().min(DROP_EACH_MIN).max(DROP_EACH_MAX),
    contact: z.string().trim().max(60).optional(),
    note: z.string().trim().min(1).max(160).optional(),
  })).max(DROP_MAX_PEOPLE).optional(),
}).refine((b) => b.brief.length >= 8 || b.recipients?.length, { message: "Send a brief, recipients, or both" });

/** An agent prepares a Drop. It waits at `approveUrl` until the account owner approves it with Kite. */
export async function POST(request: Request) {
  const key = await agentAuth(request);
  if (key instanceof Response) return key;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  const b = parsed.data;
  try {
    let title = b.title;
    let occasion = "Thank You";
    let network = b.network as NetworkId | undefined;
    let recipients = (b.recipients ?? []).map((r) => ({ name: r.name, amount: r.amount, contact: r.contact, note: r.note ?? "" }));
    // SERV writes any missing notes (and the title) from the brief; names and amounts the agent sent are kept.
    if (!recipients.length || recipients.some((r) => !r.note) || !title) {
      const list = recipients.map((r) => `\n${r.name}, ${r.amount}, ${r.contact ?? ""}`).join("");
      const d = await designDrop(`${b.brief}${list}`);
      title ??= d.title;
      occasion = d.occasion;
      network ??= d.networkFromPrompt ? d.network : undefined;
      recipients = recipients.length
        ? recipients.map((r, i) => ({ ...r, note: r.note || d.recipients[i]?.note || "Thank you — this one’s for you." }))
        : d.recipients.map((r) => ({ name: r.name, amount: Number(r.amount), contact: r.contact || undefined, note: r.note }));
    }
    if (!recipients.length) return Response.json({ error: "No recipients found" }, { status: 422 });
    if (recipients.reduce((s, r) => s + r.amount, 0) > DROP_MAX_TOTAL) return Response.json({ error: `A Drop can send up to $${DROP_MAX_TOTAL}` }, { status: 400 });
    const r = await createRequest(key, {
      kind: "drop",
      brief: b.brief,
      expiresInHours: b.expiresInHours as ExpiryHours,
      drop: { title: title ?? "Drop", occasion, network: network ?? "base", recipients },
    });
    await recordUsage(key.id, "prepared");
    return Response.json(await requestView(r, originOf(request)), { status: 201 });
  } catch (e) {
    console.error("v1 drop failed", e);
    return Response.json({ error: e instanceof ServError ? "SERV couldn't build this Drop. Try again, or send the notes yourself." : "Something went wrong" }, { status: 502 });
  }
}
