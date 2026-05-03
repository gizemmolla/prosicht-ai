import type { Metadata } from "next";
import ParticlesBackground from "@/components/ParticlesBackground";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PRO SICHT - Endüstriyel Haber Analisti",
  description: "Sanayi şirketleri fabrika taşıma, kapanış veya yatırım takip aracı.",
};

import SettingsWidget from "@/components/SettingsWidget";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <ParticlesBackground />
        {children}
        <SettingsWidget />
      </body>
    </html>
  );
}
