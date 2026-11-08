import type { Metadata } from "next";
import { DropPage } from "@/components/drop/drop-page";

export const instant = false;

export const metadata: Metadata = { title: "Drop — Plot Twist" };

export default async function DropRoute({ params }: PageProps<"/drops/[id]">) {
  return <DropPage id={(await params).id} />;
}
