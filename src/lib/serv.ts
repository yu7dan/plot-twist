import OpenAI from "openai";
import { NETWORKS, NETWORK_ORDER, isNetworkId, type NetworkId } from "./chains";
import { DROP_EACH_MAX, DROP_EACH_MIN, DROP_MAX_PEOPLE, GIFT_MAX, GIFT_MIN, money } from "./pricing";
import type { GiftDesign } from "./types";

/** SERV Reasoning (OpenAI-compatible). It designs the gift and answers the recipient's questions. */
const client = new OpenAI({
  baseURL: "https://inference-api.openserv.ai/v1",
  apiKey: process.env.SERV_API_KEY || "missing",
});
const MODEL = process.env.SERV_MODEL || "serv-mini";

export class ServError extends Error {}

type Format = { type: "json_schema"; json_schema: { name: string; strict: true; schema: Record<string, unknown> } };

async function complete(system: string, user: unknown, format?: Format, maxTokens = 700) {
  if (!process.env.SERV_API_KEY) throw new ServError("SERV_API_KEY is not set");
  try {
    const res = await client.chat.completions.create({
      model: MODEL,
      max_completion_tokens: maxTokens,
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

/* ---------- Drop: a list of people, one note each ---------- */

export interface DropDesign {
  title: string;
  occasion: string;
  network: NetworkId;
  networkFromPrompt: boolean;
  recipients: { name: string; contact: string; amount: string; note: string }[];
}

const clampEach = (n: unknown) => Math.min(DROP_EACH_MAX, Math.max(DROP_EACH_MIN, Math.round((Number(n) || 10) * 100) / 100));

/**
 * A pasted list or CSV, one person per line: name, amount, optional contact (any order of amount/contact,
 * commas, tabs or semicolons). Returns null unless at least two lines carry an amount.
 */
export function parseList(text: string) {
  const rows: { name: string; contact: string; amount: number }[] = [];
  for (const line of text.split(/\r?\n/)) {
    const cells = line.split(/[,\t;|]/).map((c) => c.trim()).filter(Boolean);
    if (cells.length < 2) continue;
    const i = cells.findIndex((c) => /^\$?\d+(\.\d{1,2})?\$?$/.test(c));
    if (i <= 0) continue; // a header row, or no amount after the name
    const rest = cells.filter((_, j) => j !== 0 && j !== i);
    rows.push({ name: cells[0].slice(0, 40), amount: Number(cells[i].replace(/\$/g, "")), contact: (rest[0] ?? "").slice(0, 60) });
  }
  return rows.length >= 2 ? rows.slice(0, DROP_MAX_PEOPLE) : null;
}

const DROP_SYSTEM = `You are Plot Twist. The sender pays a list of people at once (rewards, bounties, prizes, thank-yous).
- title: a short English title for this payout, 2–5 words, e.g. "Top contributors · November".
- occasion: English, title case, 1–3 words: "Thank You", "Bounty", "Prize", "Bonus", "Reward", "Red Packet" (红包).
- network: ${NETWORK_ORDER.join(", ")} — only if the sender named it (Robinhood or USDG means robinhood); otherwise "none".
- recipients: every person the sender lists, in their order, at most 25. name exactly as written; contact is a handle, email or
  platform mentioned for them, else ""; amount in US dollars as given (or the shared amount, e.g. "$25 each"), ${DROP_EACH_MIN}–${DROP_EACH_MAX}.
  If a list of recipients is provided, return exactly those people with exactly those amounts and contacts.
- note: for each person, a card message in the language given, written as the sender, max 120 characters, specific to what the
  sender says about that person; otherwise warm but short. No emoji, no clichés, no investment talk.`;

const DROP_FORMAT: Format = {
  type: "json_schema",
  json_schema: {
    name: "drop_design",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["title", "occasion", "network", "recipients"],
      properties: {
        title: { type: "string" },
        occasion: { type: "string" },
        network: { type: "string", enum: ["none", ...NETWORK_ORDER] },
        recipients: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["name", "contact", "amount", "note"],
            properties: { name: { type: "string" }, contact: { type: "string" }, amount: { type: "number" }, note: { type: "string" } },
          },
        },
      },
    },
  },
};

const NOTES_SYSTEM = `Write a card message for each person below, from the sender of a group payout. Same rules: the language given,
written as the sender, max 120 characters each, specific to what the brief says about that person, no emoji, no investment talk.
Return the notes in the same order as the people.`;

const NOTES_FORMAT: Format = {
  type: "json_schema",
  json_schema: {
    name: "drop_notes",
    strict: true,
    schema: { type: "object", additionalProperties: false, required: ["notes"], properties: { notes: { type: "array", items: { type: "string" } } } },
  },
};

const BATCH = 25;

export async function designDrop(brief: string): Promise<DropDesign> {
  const language = languageOf(brief);
  const list = parseList(brief);
  const first = list?.slice(0, BATCH);
  const raw = JSON.parse(await complete(DROP_SYSTEM, `Brief: ${brief.slice(0, 4000)}
${first ? `Recipients: ${JSON.stringify(first)}
` : ""}Note language: ${language}`, DROP_FORMAT, 4000)) as { title?: string; occasion?: string; network?: string; recipients?: { name?: string; contact?: string; amount?: number; note?: string }[] };

  const str = (v: unknown, max: number, fallback: string) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : fallback);
  const fromServ = (raw.recipients ?? []).slice(0, BATCH);
  let people = list
    ? list.map((r, i) => ({ name: r.name, contact: r.contact, amount: clampEach(r.amount), note: str(fromServ[i]?.note, 160, "") }))
    : fromServ.map((r) => {
        const name = str(r.name, 40, "Friend"), contact = str(r.contact, 60, "");
        // Keep a contact only if the sender actually wrote it (SERV sometimes echoes the name or invents one).
        const real = contact && contact.toLowerCase() !== name.toLowerCase() && brief.toLowerCase().includes(contact.toLowerCase());
        return { name, contact: real ? contact : "", amount: clampEach(r.amount), note: str(r.note, 160, "") };
      });

  // Longer lists: the rest of the notes in parallel batches.
  if (list && list.length > BATCH) {
    const rest = await Promise.all(
      Array.from({ length: Math.ceil((list.length - BATCH) / BATCH) }, (_, b) => {
        const chunk = list.slice(BATCH + b * BATCH, BATCH + (b + 1) * BATCH);
        return complete(NOTES_SYSTEM, { brief: brief.slice(0, 1500), language, people: chunk.map((r) => ({ name: r.name, contact: r.contact, amount: r.amount })) }, NOTES_FORMAT, 3000)
          .then((t) => (JSON.parse(t) as { notes?: string[] }).notes ?? [])
          .catch(() => [] as string[]);
      }),
    );
    const notes = rest.flat();
    people = people.map((r, i) => (i < BATCH || r.note ? r : { ...r, note: str(notes[i - BATCH], 160, "") }));
  }

  const named = isNetworkId(raw.network);
  return {
    title: str(raw.title, 60, "Thank you"),
    occasion: str(raw.occasion, 40, "Thank You"),
    network: named ? (raw.network as NetworkId) : "base",
    networkFromPrompt: named,
    recipients: people.map((r) => ({ ...r, amount: money(r.amount), note: r.note || (language === "Chinese" ? "谢谢你，一点心意。" : "Thank you — this one's for you.") })),
  };
}
