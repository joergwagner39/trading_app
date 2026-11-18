import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Trendradar – Aktienanalyse",
    short_name: "Trendradar",
    description: "Chartanalyse, Trend-Screener, Watchlist und News für Aktien",
    start_url: "/",
    display: "standalone",
    background_color: "#0e1116",
    theme_color: "#0e1116",
    lang: "de",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
