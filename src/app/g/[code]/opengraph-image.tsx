import { ImageResponse } from "next/og";
import { getGift } from "@/lib/gifts";
import { asset, OG, OG_SIZE, OgFrame, ogFonts } from "@/lib/og";

export const alt = "A sealed Plot Twist gift";
export const size = OG_SIZE;
export const contentType = "image/png";

/** The link preview keeps the surprise: who it's from and who it's for, never the amount. */
export default async function Image({ params }: { params: Promise<{ code: string }> }) {
  const found = await getGift((await params).code);
  // Unpaid gifts don't exist publicly; render the generic card for them.
  const gift = found && !["awaiting_payment", "payment_failed"].includes(found.status) ? found : null;
  const sender = gift?.senderName || "Someone";
  const recipient = gift?.recipientName;
  const [logo, mascot, fonts] = await Promise.all([asset("logo-head.png"), asset("m-secret.png"), ogFonts()]);

  return new ImageResponse(
    (
      <OgFrame logo={logo}>
        <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column", maxWidth: 640 }}>
            <div style={{ display: "flex", flexDirection: "column", fontSize: 76, fontWeight: 700, letterSpacing: -3, lineHeight: 1.02 }}>
              <span>{sender} sent you</span>
              <span style={{ color: OG.accent }}>a plot twist.</span>
            </div>
            <div style={{ display: "flex", marginTop: 26, fontSize: 30, color: OG.muted, fontWeight: 500 }}>
              {recipient ? `A gift for ${recipient}${gift?.occasion ? ` · ${gift.occasion}` : ""}. It opens sealed.` : "A gift that opens sealed."}
            </div>
            <div style={{ display: "flex", marginTop: 40 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, height: 72, padding: "0 34px", borderRadius: 24, background: OG.accent, color: OG.ink, fontSize: 30, fontWeight: 700 }}>
                Tap to unwrap →
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 380, height: 380, borderRadius: 48, background: OG.s1, border: `2px solid ${OG.line}` }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mascot} width={300} height={300} alt="" style={{ objectFit: "contain" }} />
          </div>
        </div>
      </OgFrame>
    ),
    { ...size, fonts },
  );
}
