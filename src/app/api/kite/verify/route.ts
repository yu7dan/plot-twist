import { z } from "zod";
import { KiteError, loginVerify, me, signupExchange } from "@/lib/kite";
import { rateLimit } from "@/lib/rate-limit";
import { saveKite } from "@/lib/session";

const bodySchema = z.object({
  loginId: z.string().min(1).max(200).optional(),
  signupId: z.string().min(1).max(200).optional(),
  code: z.string().trim().length(8),
  email: z.email().max(200),
});

/** Step 2: exchange the email code for a Kite session, kept server-side. */
export async function POST(request: Request) {
  const limited = await rateLimit("verify");
  if (limited) return limited;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || (!parsed.data.loginId && !parsed.data.signupId)) return Response.json({ error: "Enter the 8-character code" }, { status: 400 });
  const p = parsed.data;
  try {
    const { jwt, email, userId } = p.signupId ? await signupExchange(p.signupId, p.code) : await loginVerify(p.loginId!, p.code);
    const profile = await me(jwt);
    // The account id always comes from Kite, never from what the browser sent.
    const id = userId || profile.user_id;
    if (!id) throw new KiteError("Kite did not return an account", 502);
    await saveKite({ jwt, email: email || profile.email, userId: id });
    return Response.json({ email: profile.email, passkey: profile.passkey_readiness ?? null });
  } catch (e) {
    if (e instanceof KiteError && e.status < 500) {
      return Response.json({ error: /not verified/i.test(e.message) ? "Open the link in Kite's email first, then enter the code." : e.message }, { status: e.status });
    }
    console.error("kite verify failed", e);
    return Response.json({ error: "Kite is unavailable right now" }, { status: 502 });
  }
}
