import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ClaimExperience } from "@/components/claim/claim-experience";
import { getGift } from "@/lib/gifts";
import { toPublicGift } from "@/lib/types";

export const instant = false;

async function load(code: string) {
  const gift = await getGift(code);
  return gift && !["awaiting_payment", "payment_failed"].includes(gift.status) ? gift : null;
}

export async function generateMetadata({ params }: PageProps<"/g/[code]">): Promise<Metadata> {
  const gift = await load((await params).code);
  if (!gift) return { title: "Plot Twist" };
  // Keep the surprise: no amount in link previews.
  const title = `${gift.senderName} sent you a plot twist`;
  const description = `A gift for ${gift.recipientName}. It opens sealed.`;
  return { title, description, openGraph: { title, description, type: "website" }, twitter: { card: "summary_large_image", title, description } };
}

export default async function GiftPage({ params }: PageProps<"/g/[code]">) {
  const gift = await load((await params).code);
  if (!gift) notFound();
  return <ClaimExperience gift={toPublicGift(gift)} />;
}
