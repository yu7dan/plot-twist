import { clearKite } from "@/lib/session";

export async function POST() {
  await clearKite();
  return Response.json({ connected: false });
}
