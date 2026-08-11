import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Travel Dashboard — Curated Deals & Packages",
  description: "Professional travel deal dashboard with auto-generated packages, manual uploads, and smart extras.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
