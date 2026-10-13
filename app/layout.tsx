import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Public_Sans } from "next/font/google";
import "./globals.css";

const display = Barlow_Condensed({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-display" });
const body = Public_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-body" });

export const metadata: Metadata = {
  title: "ALLCITY Pulse",
  description: "Trending sports news matched to ALLCITY audio, video, and articles.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
