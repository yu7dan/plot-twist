import { z } from "zod";
import { KiteError, loginInit, signupInit } from "@/lib/kite";
import { rateLimit } from "@/lib/rate-limit";

const bodySchema = z.object({ email: z.email().max(200) });

/**
 * Step 1 of connecting Kite Passport. Existing users get an 8-character code;
 * new users get a verification link (where they create their passkey) plus a code.
 */
export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Enter a valid email" }, { status: 400 });
  const email = parsed.data.email.trim().toLowerCase();
  const limited = (await rateLimit("login")) ?? (await rateLimit("loginEmail", email));
  if (limited) return limited;
  try {
    try {
      const { loginId, expiresAt } = await loginInit(email);
      return Response.json({ mode: "login", loginId, expiresAt });
    } catch (e) {
      if (!(e instanceof KiteError && e.status === 404)) throw e;
      const { signupId, expiresAt } = await signupInit(email);
      return Response.json({ mode: "signup", signupId, expiresAt });
    }
  } catch (e) {
    if (e instanceof KiteError && e.status < 500) return Response.json({ error: e.message }, { status: e.status });
    console.error("kite login failed", e);
    return Response.json({ error: "Kite is unavailable right now" }, { status: 502 });
  }
}
