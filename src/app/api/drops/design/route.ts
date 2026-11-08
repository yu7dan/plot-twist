import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { designDrop, ServError } from "@/lib/serv";

const bodySchema = z.object({ brief: z.string().trim().min(8).max(8000) });

/** A pasted list or a description in, a Drop out: title, network, and each person's amount and note. */
export async function POST(request: Request) {
  const limited = await rateLimit("serv");
  if (limited) return limited;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Tell us who's getting paid" }, { status: 400 });
  try {
    const d = await designDrop(parsed.data.brief);
    if (!d.recipients.length) return Response.json({ error: "SERV couldn't find anyone to pay. Try a list: name, amount" }, { status: 422 });
    return Response.json(d);
  } catch (e) {
    console.error("SERV drop design failed", e);
    return Response.json({ error: e instanceof ServError ? "SERV couldn't build this one. Try again." : "Something went wrong" }, { status: 502 });
  }
}
