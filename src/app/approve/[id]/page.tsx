import type { Metadata } from "next";
import { ApprovePage } from "@/components/approve/approve-page";

export const instant = false;

export const metadata: Metadata = { title: "Approve — Plot Twist" };

export default async function ApproveRoute({ params }: PageProps<"/approve/[id]">) {
  return <ApprovePage id={(await params).id} />;
}
