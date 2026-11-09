import "server-only";
import { authenticate, type ApiKey } from "./api-keys";
import { rateLimit } from "./rate-limit";
import { recordUsage } from "./usage";

/** Agent API auth: a valid key within its rate limit. Returns the key, or the error response to send. */
export async function agentAuth(request: Request): Promise<ApiKey | Response> {
  const key = await authenticate(request);
  if (!key) return Response.json({ error: "Missing or invalid API key. Send Authorization: Bearer pt_live_…" }, { status: 401 });
  const limited = await rateLimit("api", key.id);
  if (limited) return limited;
  await recordUsage(key.id, "requests");
  return key;
}

export const originOf = (request: Request) => new URL(request.url).origin;
