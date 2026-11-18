import type { Signal } from "./analysis";

export const fmtNum = (v: number | null | undefined, d = 2) =>
  v == null || !isFinite(v) ? "–" : v.toLocaleString("de-DE", { minimumFractionDigits: d, maximumFractionDigits: d });

export const fmtPct = (v: number | null | undefined, d = 1) =>
  v == null || !isFinite(v) ? "–" : `${v > 0 ? "+" : ""}${fmtNum(v, d)} %`;

export const fmtPrice = (v: number | null | undefined, currency?: string) =>
  v == null ? "–" : `${fmtNum(v, v < 10 ? 3 : 2)}${currency ? ` ${currency === "EUR" ? "€" : currency === "USD" ? "$" : currency}` : ""}`;

export const SIGNAL_LABEL: Record<Signal, string> = {
  "stark-bullisch": "Stark bullisch",
  bullisch: "Bullisch",
  neutral: "Neutral",
  "bärisch": "Bärisch",
  "stark-bärisch": "Stark bärisch",
};

export const signalTone = (s: Signal) => (s.includes("bullisch") ? "up" : s.includes("bärisch") ? "down" : "flat");

export const relTime = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 60) return `vor ${Math.max(m, 1)} Min.`;
  const h = Math.round(m / 60);
  if (h < 24) return `vor ${h} Std.`;
  return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
};
