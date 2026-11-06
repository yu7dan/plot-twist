import type { NextRequest } from "next/server";
import { z } from "zod";
import { getGift } from "@/lib/gifts";
import { rateLimit } from "@/lib/rate-limit";
import { answerQuestion } from "@/lib/serv";

const bodySchema = z.object({ question: z.string().trim().min(1).max(300) });

/** "What is USDC?" — SERV answers in the context of this gift. */
export async function POST(request: NextRequest, ctx: RouteContext<"/api/gifts/[code]/ask">) {
  const limited = await rateLimit("ask");
  if (limited) return limited;
  const { code } = await ctx.params;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Ask a short question (under 300 characters)." }, { status: 400 });
  const gift = await getGift(code);
  if (!gift || !["sealed", "claiming", "claimed"].includes(gift.status)) return Response.json({ error: "Gift not found" }, { status: 404 });
  try {
    const { recipientName, occasion, amount, network, note, senderName } = gift;
    return Response.json({ answer: await answerQuestion({ recipientName, occasion, amount, network, note, senderName }, parsed.data.question) });
  } catch (e) {
    console.error("SERV ask failed", e);
    return Response.json({ error: "SERV couldn't answer right now. Try again." }, { status: 502 });
  }
}
