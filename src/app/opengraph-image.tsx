import { ImageResponse } from "next/og";
import { asset, OG, OG_SIZE, OgFrame, ogFonts } from "@/lib/og";

export const alt = "Plot Twist — send money like a gift";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
  const [logo, mascot, fonts] = await Promise.all([asset("logo-head.png"), asset("m-surprise.png"), ogFonts()]);
  return new ImageResponse(
    (
      <OgFrame logo={logo}>
        <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", flexDirection: "column", fontSize: 80, fontWeight: 700, letterSpacing: -3.5, lineHeight: 1.02 }}>
              <span>Send money</span>
              <span style={{ color: OG.accent }}>like a gift.</span>
            </div>
            <div style={{ display: "flex", marginTop: 28, fontSize: 30, color: OG.muted, fontWeight: 500 }}>
              To one person, a whole list, or through your AI agent.
            </div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mascot} width={250} height={250} alt="" style={{ objectFit: "contain" }} />
        </div>
      </OgFrame>
    ),
    { ...size, fonts },
  );
}
