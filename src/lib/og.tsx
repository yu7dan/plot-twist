import { readFile } from "node:fs/promises";
import path from "node:path";

/** Shared pieces for link-preview images (Telegram, X, WhatsApp…). */
export const OG_SIZE = { width: 1200, height: 630 };

const root = process.cwd();

export async function ogFonts() {
  const [medium, bold] = await Promise.all([
    readFile(path.join(root, "src/assets/fonts/Geist-Medium.ttf")),
    readFile(path.join(root, "src/assets/fonts/Geist-Bold.ttf")),
  ]);
  return [
    { name: "Geist", data: medium, weight: 500 as const, style: "normal" as const },
    { name: "Geist", data: bold, weight: 700 as const, style: "normal" as const },
  ];
}

/** Public image as a data URL (the image renderer can't fetch relative paths). */
export async function asset(file: string) {
  const data = await readFile(path.join(root, "public/assets", file));
  return `data:image/png;base64,${data.toString("base64")}`;
}

export const OG = { bg: "#0A0A0B", text: "#F5F5F6", muted: "#8E8E96", accent: "#C8F542", ink: "#0A0A0B", s1: "#121214", line: "rgba(255,255,255,0.1)" };

/** Frame: dark canvas, lime glow, logo top-left. */
export function OgFrame({ logo, children }: { logo: string; children: React.ReactNode }) {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: OG.bg, backgroundImage: "radial-gradient(circle at 82% 0%, rgba(200,245,66,0.20) 0%, rgba(200,245,66,0.06) 32%, rgba(200,245,66,0) 60%)", color: OG.text, fontFamily: "Geist", position: "relative", padding: "56px 64px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 30, fontWeight: 700 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logo} width={52} height={52} alt="" />
        Plot Twist
      </div>
      {children}
    </div>
  );
}
