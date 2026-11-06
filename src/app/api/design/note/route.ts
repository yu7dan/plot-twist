import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { rewriteNote } from "@/lib/serv";

const bodySchema = z.object({
  prompt: z.string().max(400),
  recipientName: z.string().max(40),
  occasion: z.string().max(40),
  note: z.string().max(200),
});

export async function POST(request: Request) {
  const limited = await rateLimit("serv");
  if (limited) return limited;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  try {
    return Response.json({ note: await rewriteNote(parsed.data) });
  } catch (e) {
    console.error("SERV note failed", e);
    return Response.json({ error: "SERV couldn't rewrite the note. Try again." }, { status: 502 });
  }
}
