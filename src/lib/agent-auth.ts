import "server-only";
import { authenticate, type ApiKey } from "./api-keys";
import { rateLimit } from "./rate-limit";

/** Agent API auth: a valid key within its rate limit. Returns the key, or the error response to send. */
export async function agentAuth(request: Request): Promise<ApiKey | Response> {
  const key = await authenticate(request);
  if (!key) return Response.json({ error: "Missing or invalid API key. Send Authorization: Bearer pt_live_…" }, { status: 401 });
  return (await rateLimit("api", key.id)) ?? key;
}

export const originOf = (request: Request) => new URL(request.url).origin;
