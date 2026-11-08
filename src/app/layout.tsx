import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");
const title = "Plot Twist — Every gift deserves a plot twist";
const description = "Describe a gift in one sentence. AI designs it, Kite Passport pays for it, and they unwrap it from a single link.";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title,
  description,
  icons: { icon: "/assets/app-icon.png", apple: "/assets/app-icon.png" },
  openGraph: { title, description, type: "website", siteName: "Plot Twist" },
  twitter: { card: "summary_large_image", title, description },
};

export const viewport: Viewport = { themeColor: "#0A0A0B", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
