import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { designGift, ServError } from "@/lib/serv";

const bodySchema = z.object({ prompt: z.string().trim().min(8).max(400) });

/** One sentence in, a gift design out (recipient, occasion, amount, network, note). */
export async function POST(request: Request) {
  const limited = await rateLimit("serv");
  if (limited) return limited;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Tell us a little more about the gift" }, { status: 400 });
  try {
    return Response.json(await designGift(parsed.data.prompt));
  } catch (e) {
    console.error("SERV design failed", e);
    return Response.json({ error: e instanceof ServError ? "SERV couldn't design this one. Try again." : "Something went wrong" }, { status: 502 });
  }
}
