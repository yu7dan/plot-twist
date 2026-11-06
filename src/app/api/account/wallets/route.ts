import { z } from "zod";
import { linkMessage, linkNonce, linkWallet, unlinkWallet } from "@/lib/accounts";
import { rateLimit } from "@/lib/rate-limit";
import { getKite } from "@/lib/session";
import { validAddress, verifySignature } from "@/lib/signatures";

const kindSchema = z.enum(["evm", "solana"]);

/** The message a wallet signs to be linked to the signed-in account. */
export async function GET(request: Request) {
  const kite = await getKite();
  if (!kite) return Response.json({ error: "Sign in first" }, { status: 401 });
  const url = new URL(request.url);
  const address = url.searchParams.get("address") || "";
  const kind = kindSchema.safeParse(url.searchParams.get("kind"));
  if (!kind.success || !validAddress(kind.data, address)) return Response.json({ error: "Invalid wallet" }, { status: 400 });
  return Response.json({ message: linkMessage(kite.email, address, linkNonce(kite.sessionId, address)) });
}

const linkSchema = z.object({ address: z.string().min(32).max(64), kind: kindSchema, signature: z.string().min(64).max(4000) });

export async function POST(request: Request) {
  const kite = await getKite();
  if (!kite) return Response.json({ error: "Sign in first" }, { status: 401 });
  const limited = await rateLimit("link");
  if (limited) return limited;
  const parsed = linkSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid wallet" }, { status: 400 });
  const { address, kind, signature } = parsed.data;
  const message = linkMessage(kite.email, address, linkNonce(kite.sessionId, address));
  if (!(await verifySignature(kind, address, message, signature))) return Response.json({ error: "Signature doesn't match this wallet" }, { status: 401 });
  return Response.json({ wallets: await linkWallet(kite.userId || kite.email, kite.email, address, kind) });
}

export async function DELETE(request: Request) {
  const kite = await getKite();
  if (!kite) return Response.json({ error: "Sign in first" }, { status: 401 });
  const address = new URL(request.url).searchParams.get("address") || "";
  return Response.json({ wallets: await unlinkWallet(kite.userId || kite.email, address) });
}
