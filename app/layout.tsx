import type { Metadata, Viewport } from "next";
import Nav from "@/components/Nav";
import SwRegister from "@/components/SwRegister";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trendradar",
  description: "Chartanalyse, Trend-Screener, Watchlist und News für Aktien",
  appleWebApp: { capable: true, title: "Trendradar", statusBarStyle: "black-translucent" },
  icons: { icon: "/icon.svg", apple: "/icon-192.png" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7f9" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1116" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>
        <Nav />
        <main className="page">{children}</main>
        <footer className="disclaimer">
          Keine Anlageberatung. Alle Signale sind automatisch aus technischen Indikatoren berechnet und können falsch sein.
          Kursdaten: Yahoo Finance, ggf. verzögert.
        </footer>
        <SwRegister />
      </body>
    </html>
  );
}
