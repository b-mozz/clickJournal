// Root layout for the Next.js app. Wraps every page with the HTML shell,
// global styles and the typeface. Sets no width: each page picks its own
// container (docs/specs/design-system.md).
import type { Metadata } from "next";
import { Jost } from "next/font/google";
import "./globals.css";

const jost = Jost({ subsets: ["latin"], variable: "--font-jost", display: "swap" });

export const metadata: Metadata = {
  title: "ClickJournal",
  description: "Get out there. Photograph your city, one place at a time.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={jost.variable}>
      <body className="bg-paper font-sans text-ink antialiased">{children}</body>
    </html>
  );
}
