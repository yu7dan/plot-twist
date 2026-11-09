import { z } from "zod";
import { createKey, listKeys, revokeKey, type ApiKey } from "@/lib/api-keys";
import { getKite } from "@/lib/session";

const show = (k: ApiKey) => ({ id: k.id, name: k.name, prefix: k.prefix, createdAt: k.createdAt, lastUsedAt: k.lastUsedAt });

/** The signed-in account's API keys (never the keys themselves). */
export async function GET() {
  const kite = await getKite();
  if (!kite) return Response.json({ error: "Connect Kite Passport first" }, { status: 401 });
  return Response.json({ keys: (await listKeys(kite.userId || kite.email)).map(show) });
}

const createSchema = z.object({ name: z.string().trim().max(40).default("") });

/** Creates a key; the full key is returned this once only. */
export async function POST(request: Request) {
  const kite = await getKite();
  if (!kite) return Response.json({ error: "Connect Kite Passport first" }, { status: 401 });
  const parsed = createSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: "Invalid name" }, { status: 400 });
  try {
    const { key, record } = await createKey(kite.userId || kite.email, kite.email, parsed.data.name);
    return Response.json({ key, ...show(record) }, { status: 201 });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Couldn't create a key" }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const kite = await getKite();
  if (!kite) return Response.json({ error: "Connect Kite Passport first" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id") ?? "";
  return (await revokeKey(kite.userId || kite.email, id)) ? Response.json({ ok: true }) : Response.json({ error: "Key not found" }, { status: 404 });
}
