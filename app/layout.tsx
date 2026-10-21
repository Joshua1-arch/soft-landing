import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Soft Landing — 12-Week Cultural On-Ramp",
  description:
    "A 12-week cultural on-ramp for people who just moved countries — sequenced by Qloo's taste graph, built on the fact that familiarity is a dose you can calibrate.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#FBF9F5] text-[#14171A]">
        {children}
      </body>
    </html>
  );
}
