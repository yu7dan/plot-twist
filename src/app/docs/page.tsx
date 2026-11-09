import type { Metadata } from "next";
import { DocsPage } from "@/components/docs/docs-page";

export const metadata: Metadata = { title: "Agent API — Plot Twist", description: "Let your AI agent prepare USDC gifts and payouts. You approve every payment with your Kite passkey." };

export default function Docs() {
  return <DocsPage />;
}
