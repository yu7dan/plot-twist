import OpenAI from "openai";
import { NETWORKS, NETWORK_ORDER, isNetworkId, type NetworkId } from "./chains";
import { GIFT_MAX, GIFT_MIN, money } from "./pricing";
import type { GiftDesign } from "./types";

/** SERV Reasoning (OpenAI-compatible). It designs the gift and answers the recipient's questions. */
const client = new OpenAI({
  baseURL: "https://inference-api.openserv.ai/v1",
  apiKey: process.env.SERV_API_KEY || "missing",
});
const MODEL = process.env.SERV_MODEL || "serv-mini";

export class ServError extends Error {}

type Format = { type: "json_schema"; json_schema: { name: string; strict: true; schema: Record<string, unknown> } };

async function complete(system: string, user: unknown, format?: Format) {
  if (!process.env.SERV_API_KEY) throw new ServError("SERV_API_KEY is not set");
  try {
    const res = await client.chat.completions.create({
      model: MODEL,
      max_completion_tokens: 700,
      ...(format ? { response_format: format } : {}),
      messages: [
        { role: "system", content: system },
        { role: "user", content: typeof user === "string" ? user : JSON.stringify(user) },
      ],
    });
    const text = res.choices[0]?.message?.content?.trim();
    if (!text) throw new ServError("SERV returned an empty answer");
    return text;
  } catch (e) {
    if (e instanceof ServError) throw e;
    throw new ServError(e instanceof Error ? e.message : "SERV is unavailable");
  }
}

/** Notes are written in the sender's language; we only tell Chinese from English. */
const languageOf = (text: string) => (/[一-鿿]/.test(text) ? "Chinese" : "English");

const DESIGN_SYSTEM = `You are Plot Twist, an AI gift concierge. The sender describes a gift in one sentence. Design a digital-dollar gift from it.
- recipientName: the recipient's name exactly as written (小林 stays 小林). If only a relation is given, use the plain English word for it: "my mom" / "妈妈" → "Mom", "my sister" → "Sister".
- occasion: always in English, title case, 1–3 words: "Birthday", "New Job", "Thank You", "Wedding", "Just Because" (新工作 → "New Job", 感谢 → "Thank You").
- amount: US dollars the sender asked for, ${GIFT_MIN} to ${GIFT_MAX}; 50 if none is given.
- network: ${NETWORK_ORDER.join(", ")} — only if the sender named it (Robinhood or USDG means robinhood); otherwise "none".
- note: the card message in the language given, written as the sender, max 140 characters, warm and specific to the details given; no clichés, no emoji, no investment talk.
- insight: always in English, one short sentence telling the sender which personal detail the note picks up, e.g. "The note nods to her move to Berlin." Use "" if there is none. Never mention the network.`;

const DESIGN_FORMAT: Format = {
  type: "json_schema",
  json_schema: {
    name: "gift_design",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["recipientName", "occasion", "amount", "network", "note", "insight"],
      properties: {
        recipientName: { type: "string" },
        occasion: { type: "string" },
        amount: { type: "number" },
        network: { type: "string", enum: ["none", ...NETWORK_ORDER] },
        note: { type: "string" },
        insight: { type: "string" },
      },
    },
  },
};

export interface Design extends GiftDesign { insight: string; networkFromPrompt: boolean }

export async function designGift(prompt: string): Promise<Design> {
  const raw = JSON.parse(await complete(DESIGN_SYSTEM, `Sentence: ${prompt}
Note language: ${languageOf(prompt)}`, DESIGN_FORMAT)) as Record<string, unknown>;
  const amount = Math.min(GIFT_MAX, Math.max(GIFT_MIN, Math.round(Number(raw.amount) || 50)));
  const named = isNetworkId(raw.network);
  const str = (v: unknown, max: number, fallback: string) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : fallback);
  return {
    recipientName: str(raw.recipientName, 40, "Friend"),
    occasion: str(raw.occasion, 40, "Just Because"),
    amount: money(amount),
    network: named ? (raw.network as NetworkId) : "base",
    networkFromPrompt: named,
    note: str(raw.note, 160, "A little something, just for you."),
    insight: str(raw.insight, 160, ""),
  };
}

const NOTE_SYSTEM = `Rewrite the card message for this gift. Same language as the original, written as the sender, max 140 characters,
warm and specific, a different angle from the original. No emoji, no investment talk. Return only the message.`;

export async function rewriteNote(g: { prompt: string; recipientName: string; occasion: string; note: string }) {
  return (await complete(NOTE_SYSTEM, g)).replace(/^["“]|["”]$/g, "").slice(0, 160);
}

const ASK_SYSTEM = `You are the voice of a Plot Twist gift: a sum of digital dollars (a dollar stablecoin) sent with a personal note.
Answer the recipient's question in 2–3 warm, plain sentences, in the language of the question.
You may explain what USDC or USDG is (a digital dollar, 1:1 with the US dollar, issued by Circle or Paxos), how claiming works,
and gentle ideas like keeping it, spending it, or passing it on. Never give investment advice, predictions or yield promises. Plain text only.`;

export async function answerQuestion(gift: GiftDesign & { senderName: string }, question: string) {
  const net = NETWORKS[gift.network];
  return complete(ASK_SYSTEM, { gift: { ...gift, asset: net.asset.symbol, issuer: net.asset.symbol === "USDG" ? "Paxos" : "Circle", networkName: net.name }, question });
}
