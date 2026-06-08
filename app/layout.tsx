import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://when-demand-exceeds-supply.vercel.app"),
  title: "When Demand Exceeds Supply in an Online Marketplace",
  description:
    "Real-time demand-supply intelligence system for two-sided marketplaces, barometer engine, surge pricing, incentive orchestration, and AI escalation routing. Built for Coto, open-sourced for every marketplace operator.",
  openGraph: {
    title: "When Demand Exceeds Supply in an Online Marketplace",
    description:
      "Real-time demand-supply intelligence system for two-sided marketplaces, built for Coto, open-sourced for every operator.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
