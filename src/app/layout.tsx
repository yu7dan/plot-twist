import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");
const title = "Plot Twist — Send money like a gift";
const description = "Gift links for one person, Drops for a whole list, and an API for your AI agent. SERV writes the notes, Kite Passport approves every payment, they claim with any wallet.";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title,
  description,
  icons: { icon: "/assets/app-icon.png", apple: "/assets/app-icon.png" },
  openGraph: { title, description, type: "website", siteName: "Plot Twist" },
  twitter: { card: "summary_large_image", title, description },
};

export const viewport: Viewport = {
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#FFFFFF" }, { media: "(prefers-color-scheme: dark)", color: "#0F0F10" }],
  width: "device-width",
  initialScale: 1,
};

// Sets the theme before first paint (saved choice, else the system's), so there's no flash of the wrong one.
const THEME_SCRIPT = `try{var t=localStorage.getItem("pt-theme");if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`} data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
