import "server-only";
import YahooFinance from "yahoo-finance2";
import type { Candle } from "./indicators";
import { ALL_SYMBOLS } from "./universe";

// Datenquelle: Yahoo Finance (kein API-Key nötig).
// Mit DEMO_DATA=1 werden synthetische Kurse erzeugt – nur zum Entwickeln/Testen.
export const DEMO = process.env.DEMO_DATA === "1";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

export type History = {
  symbol: string;
  name: string;
  currency: string;
  exchange: string;
  candles: Candle[];
  demo: boolean;
};

export type NewsItem = {
  id: string;
  title: string;
  publisher: string;
  link: string;
  time: string; // ISO
  thumbnail?: string;
};

export type SearchHit = { symbol: string; name: string; exchange: string; type: string };

// --- einfacher In-Memory-Cache ------------------------------------------------
const cache = new Map<string, { at: number; value: unknown }>();
const inflight = new Map<string, Promise<unknown>>();
async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value as T;
  if (inflight.has(key)) return inflight.get(key) as Promise<T>;
  const p = fn().finally(() => inflight.delete(key));
  inflight.set(key, p);
  const value = await p;
  cache.set(key, { at: Date.now(), value });
  if (cache.size > 2000) cache.delete(cache.keys().next().value!);
  return value;
}

const toDay = (d: Date) => d.toISOString().slice(0, 10);

export function normalizeSymbol(s: string) {
  return decodeURIComponent(s).trim().toUpperCase();
}

// Immer 3 Jahre laden: genug für SMA 200 + 12-Monats-Performance, ein Cache für alle Ansichten.
const YEARS = 3;

/** maxAgeMs: wie alt gecachte Daten höchstens sein dürfen (Einzelwerte 1 Min., Screener 15 Min.). */
export async function getHistory(symbol: string, maxAgeMs = 60_000): Promise<History> {
  symbol = normalizeSymbol(symbol);
  return cached(`h:${symbol}`, maxAgeMs, async () => {
    if (DEMO) return demoHistory(symbol, YEARS);
    const period1 = new Date();
    period1.setFullYear(period1.getFullYear() - YEARS);
    const res = await yf.chart(symbol, { period1, interval: "1d" });
    const candles: Candle[] = [];
    for (const q of res.quotes) {
      if (q.open == null || q.high == null || q.low == null || q.close == null) continue;
      candles.push({ time: toDay(q.date), open: q.open, high: q.high, low: q.low, close: q.close, volume: q.volume ?? 0 });
    }
    // Doppelte Tage (z. B. laufender Handelstag) entfernen – letzter gewinnt
    const byDay = new Map(candles.map((c) => [c.time, c]));
    const meta = res.meta as Record<string, unknown>;
    return {
      symbol,
      name: String(meta.longName ?? meta.shortName ?? symbol),
      currency: res.meta.currency ?? "",
      exchange: res.meta.fullExchangeName ?? res.meta.exchangeName ?? "",
      candles: [...byDay.values()],
      demo: false,
    };
  });
}

export async function getNews(symbol: string, count = 12): Promise<NewsItem[]> {
  symbol = normalizeSymbol(symbol);
  return cached(`n:${symbol}`, 10 * 60_000, async () => {
    if (DEMO) return demoNews(symbol);
    const res = await yf.search(symbol, { newsCount: count, quotesCount: 0 });
    return (res.news ?? []).map((n) => ({
      id: n.uuid,
      title: n.title,
      publisher: n.publisher,
      link: n.link,
      time: new Date(n.providerPublishTime).toISOString(),
      thumbnail: n.thumbnail?.resolutions?.find((r) => r.width <= 200)?.url ?? n.thumbnail?.resolutions?.[0]?.url,
    }));
  });
}

export async function search(q: string): Promise<SearchHit[]> {
  q = q.trim();
  if (!q) return [];
  return cached(`s:${q.toLowerCase()}`, 60 * 60_000, async () => {
    if (DEMO) {
      return ALL_SYMBOLS.filter((s) => s.toLowerCase().includes(q.toLowerCase()))
        .slice(0, 10)
        .map((s) => ({ symbol: s, name: demoName(s), exchange: "DEMO", type: "EQUITY" }));
    }
    const res = await yf.search(q, { quotesCount: 10, newsCount: 0 });
    return res.quotes
      .filter((x): x is typeof x & { symbol: string } => "symbol" in x && typeof x.symbol === "string")
      .filter((x) => ["EQUITY", "ETF", "INDEX"].includes(String(x.quoteType)))
      .map((x) => ({
        symbol: x.symbol,
        name: String(x.longname ?? x.shortname ?? x.symbol),
        exchange: String(x.exchDisp ?? x.exchange ?? ""),
        type: String(x.quoteType),
      }));
  });
}

/** Führt `fn` für alle Elemente mit begrenzter Parallelität aus. */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx]);
      }
    }),
  );
  return out;
}

// --- Demo-Daten ----------------------------------------------------------------
function hash(s: string) {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function demoName(s: string) {
  return `${s.split(".")[0]} Demo AG`;
}
function demoHistory(symbol: string, years: number): History {
  const r = rng(hash(symbol));
  const days = Math.round(years * 252);
  let price = 20 + r() * 300;
  // Mehrere Trendphasen mit unterschiedlicher Drift
  const phases = Array.from({ length: 5 }, () => (r() - 0.45) * 0.004);
  const vol = 0.01 + r() * 0.02;
  const candles: Candle[] = [];
  const d = new Date();
  d.setDate(d.getDate() - Math.round(days * 1.45));
  while (candles.length < days) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() === 0 || d.getDay() === 6) continue;
    const drift = phases[Math.floor((candles.length / days) * phases.length)];
    const ret = drift + (r() + r() + r() - 1.5) * vol * 1.4;
    const open = price;
    const close = Math.max(1, price * (1 + ret));
    const high = Math.max(open, close) * (1 + r() * vol);
    const low = Math.min(open, close) * (1 - r() * vol);
    candles.push({ time: toDay(d), open, high, low, close, volume: Math.round(1e5 + r() * 5e6) });
    price = close;
  }
  return { symbol, name: demoName(symbol), currency: symbol.endsWith(".DE") ? "EUR" : "USD", exchange: "DEMO", candles, demo: true };
}
function demoNews(symbol: string): NewsItem[] {
  const now = Date.now();
  return ["Quartalszahlen über den Erwartungen", "Analyst erhöht Kursziel", "Neue Produktstrategie vorgestellt", "Branche unter Druck"].map(
    (t, i) => ({
      id: `${symbol}-${i}`,
      title: `[Demo] ${demoName(symbol)}: ${t}`,
      publisher: "Demo-Quelle",
      link: "#",
      time: new Date(now - i * 9 * 3600_000).toISOString(),
    }),
  );
}
