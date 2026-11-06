import { signupStatus } from "@/lib/kite";

/** Polled while a new user opens Kite's verification link and creates their passkey. */
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("signupId");
  if (!id) return Response.json({ error: "Missing signupId" }, { status: 400 });
  try {
    return Response.json({ status: await signupStatus(id) });
  } catch {
    return Response.json({ status: "pending" });
  }
}
