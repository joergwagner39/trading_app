import "server-only";
import YahooFinance from "yahoo-finance2";
import type { Candle } from "./indicators";
import { DEMO, getHistory, getNews, mapLimit, type NewsItem } from "./data";
import { etfName, sectorOf, SECTOR_ETFS, EU_SECTOR_ETFS, UNIVERSES } from "./universe";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

export const MARKETS = [
  { symbol: "^GDAXI", name: "DAX" },
  { symbol: "^STOXX50E", name: "Euro Stoxx 50" },
  { symbol: "^GSPC", name: "S&P 500" },
  { symbol: "^IXIC", name: "Nasdaq" },
  { symbol: "^DJI", name: "Dow Jones" },
  { symbol: "GC=F", name: "Gold" },
  { symbol: "BZ=F", name: "Brent-Öl" },
  { symbol: "EURUSD=X", name: "EUR/USD" },
  { symbol: "BTC-USD", name: "Bitcoin" },
];

export type Move = {
  symbol: string;
  name: string;
  sector?: string;
  date: string; // Berichtstag
  close: number;
  changePct: number | null; // Veränderung am Berichtstag
  todayPct: number | null; // laufender Handelstag (falls heute gehandelt)
};

export type Briefing = {
  today: string;
  reportDate: string | null;
  text: string[];
  markets: Move[];
  sectorsUs: Move[];
  sectorsEu: Move[];
  gainers: Move[];
  losers: Move[];
  watchlist: Move[];
  demo: boolean;
  at: string;
};

export type Earning = {
  symbol: string;
  name: string;
  sector: string;
  date: string;
  estimate: boolean;
  epsAvg: number | null; // erwarteter Gewinn je Aktie
  inWatchlist: boolean;
  marketCap: number | null;
  time: "vor Börsenstart" | "nach Börsenschluss" | null;
  region: "USA" | "Europa";
  currency: string;
};

/** Heutiges Datum in Deutschland (YYYY-MM-DD). */
export const berlinToday = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin" }).format(new Date());

/** Veränderung am letzten abgeschlossenen Handelstag (vor heute) und am laufenden Tag. */
function moveOf(symbol: string, name: string, candles: Candle[], today: string): Move | null {
  if (candles.length < 3) return null;
  let i = candles.length - 1;
  const todayIdx = candles[i].time >= today ? i : -1;
  if (todayIdx >= 0) i--;
  const c = candles[i];
  const prev = candles[i - 1];
  const todayPct = todayIdx >= 0 ? ((candles[todayIdx].close / c.close - 1) * 100) : null;
  return { symbol, name, sector: sectorOf(symbol), date: c.time, close: c.close, changePct: prev ? (c.close / prev.close - 1) * 100 : null, todayPct };
}

async function moves(list: { symbol: string; name?: string }[], today: string): Promise<Move[]> {
  const res = await mapLimit(list, 8, async ({ symbol, name }) => {
    try {
      const h = await getHistory(symbol, 15 * 60_000);
      return moveOf(symbol, name ?? h.name, h.candles, today);
    } catch {
      return null;
    }
  });
  return res.filter((m): m is Move => m != null);
}

const pct = (v: number | null | undefined) =>
  v == null ? "–" : `${v > 0 ? "+" : ""}${v.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;
const num = (v: number, d = 0) => v.toLocaleString("de-DE", { minimumFractionDigits: d, maximumFractionDigits: d });
const dayName = (iso: string) =>
  new Date(iso + "T12:00:00Z").toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

function writeText(b: Omit<Briefing, "text">): string[] {
  const m = Object.fromEntries(b.markets.map((x) => [x.name, x]));
  const out: string[] = [];
  const dax = m["DAX"];
  const spx = m["S&P 500"];
  const ndq = m["Nasdaq"];
  if (dax || spx) {
    const avg = [dax?.changePct, spx?.changePct, ndq?.changePct].filter((v): v is number => v != null);
    const mean = avg.reduce((a, v) => a + v, 0) / Math.max(avg.length, 1);
    const mood =
      mean > 1 ? "Kräftige Gewinne an den Börsen" : mean > 0.3 ? "Freundlicher Handel" : mean < -1 ? "Deutliche Verluste an den Börsen" : mean < -0.3 ? "Schwacher Handel" : "Uneinheitlicher Handel";
    const parts: string[] = [];
    if (dax) parts.push(`der DAX schloss ${pct(dax.changePct)} bei ${num(dax.close)} Punkten`);
    if (spx) parts.push(`der S&P 500 ${pct(spx.changePct)}`);
    if (ndq) parts.push(`die Nasdaq ${pct(ndq.changePct)}`);
    out.push(`${mood} am ${dayName(b.reportDate ?? (dax ?? spx)!.date)}: ${parts.join(", ")}.`);
  }
  const sec = [...b.sectorsUs].filter((s) => s.changePct != null).sort((x, y) => y.changePct! - x.changePct!);
  if (sec.length >= 3) {
    const best = sec.slice(0, 2);
    const worst = sec[sec.length - 1];
    out.push(`Bei den US-Sektoren lagen ${best.map((s) => `${s.name} (${s.symbol}, ${pct(s.changePct)})`).join(" und ")} vorn, am schwächsten war ${worst.name} (${worst.symbol}, ${pct(worst.changePct)}).`);
  }
  const g = b.gainers[0];
  const l = b.losers[0];
  if (g && l) out.push(`Größter Gewinner unter den beobachteten Aktien war ${g.name} (${pct(g.changePct)}), größter Verlierer ${l.name} (${pct(l.changePct)}).`);
  const extra = ["Gold", "Brent-Öl", "EUR/USD", "Bitcoin"].map((k) => m[k]).filter(Boolean) as Move[];
  if (extra.length) out.push(`Sonstige Märkte: ${extra.map((x) => `${x.name} ${pct(x.changePct)}`).join(", ")}.`);
  if (b.watchlist.length) {
    const up = b.watchlist.filter((x) => (x.changePct ?? 0) > 0).length;
    const big = [...b.watchlist].filter((x) => x.changePct != null).sort((x, y) => Math.abs(y.changePct!) - Math.abs(x.changePct!))[0];
    out.push(
      `Deine Watchlist: ${up} von ${b.watchlist.length} Werten im Plus` +
        (big && Math.abs(big.changePct!) >= 2 ? `, auffällig ${big.name} mit ${pct(big.changePct)}.` : "."),
    );
  }
  const live = [dax, spx].filter((x) => x?.todayPct != null) as Move[];
  if (live.length) out.push(`Heute bisher: ${live.map((x) => `${x.name} ${pct(x.todayPct)}`).join(", ")}.`);
  return out;
}

export async function getBriefing(watch: string[]): Promise<Briefing> {
  const today = berlinToday();
  const [markets, sectorsUs, sectorsEu, stocks, watchlist] = await Promise.all([
    moves(MARKETS, today),
    moves(Object.keys(SECTOR_ETFS).map((s) => ({ symbol: s, name: etfName(s) })), today),
    moves(Object.keys(EU_SECTOR_ETFS).map((s) => ({ symbol: s, name: etfName(s) })), today),
    moves(UNIVERSES.all.symbols.map((s) => ({ symbol: s })), today),
    moves(watch.map((s) => ({ symbol: s })), today),
  ]);
  const byChange = (a: Move, b: Move) => (b.changePct ?? -999) - (a.changePct ?? -999);
  // Berichtstag = häufigstes Datum der Indizes
  const dates = markets.slice(0, 5).map((x) => x.date).sort();
  const reportDate = dates.length ? dates[dates.length - 1] : null;
  const sorted = stocks.filter((x) => x.changePct != null).sort(byChange);
  const base = {
    today,
    reportDate,
    markets,
    sectorsUs: sectorsUs.sort(byChange),
    sectorsEu: sectorsEu.sort(byChange),
    gainers: sorted.slice(0, 6),
    losers: sorted.slice(-6).reverse(),
    watchlist: watchlist.sort(byChange),
    demo: DEMO,
    at: new Date().toISOString(),
  };
  return { ...base, text: writeText(base) };
}

// --- Quartalszahlen ---------------------------------------------------------
// USA: vollständiger Kalender von Nasdaq (alle Unternehmen, mit Börsenwert und Uhrzeit).
// Deutschland/Europa: Termine je Aktie über Yahoo (DAX-, Europa-Listen + Watchlist).

type EarnInfo = { date: string; estimate: boolean; epsAvg: number | null };
const earnCache = new Map<string, { at: number; v: EarnInfo | null }>();

function demoHash(s: string) {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

async function nextEarnings(symbol: string): Promise<EarnInfo | null> {
  const hit = earnCache.get(symbol);
  if (hit && Date.now() - hit.at < 12 * 3600_000) return hit.v;
  let v: EarnInfo | null = null;
  if (DEMO) {
    const h = demoHash(symbol);
    if (h % 3 === 0) {
      const d = new Date();
      d.setDate(d.getDate() + (h % 10) - 1);
      v = { date: d.toISOString().slice(0, 10), estimate: h % 2 === 0, epsAvg: null };
    }
  } else {
    try {
      const r = await yf.quoteSummary(symbol, { modules: ["calendarEvents"] });
      const e = r.calendarEvents?.earnings;
      const d = e?.earningsDate?.[0];
      if (d) v = { date: new Date(d).toISOString().slice(0, 10), estimate: !!e?.isEarningsDateEstimate, epsAvg: e?.earningsAverage ?? null };
    } catch {
      v = null;
    }
  }
  earnCache.set(symbol, { at: Date.now(), v });
  return v;
}

type UsRow = { symbol: string; name: string; marketCap: number | null; eps: number | null; time: Earning["time"] };
const usCache = new Map<string, { at: number; v: UsRow[] }>();
const money = (s: unknown) => {
  if (typeof s !== "string") return null;
  const neg = s.includes("(");
  const n = parseFloat(s.replace(/[^0-9.]/g, ""));
  return isFinite(n) ? (neg ? -n : n) : null;
};

/** Alle US-Quartalszahlen eines Tages (Nasdaq-Kalender). */
async function usEarnings(date: string): Promise<UsRow[]> {
  const hit = usCache.get(date);
  if (hit && Date.now() - hit.at < 6 * 3600_000) return hit.v;
  let v: UsRow[] = [];
  if (DEMO) {
    const day = new Date(date + "T12:00:00Z").getUTCDay();
    if (day !== 0 && day !== 6) {
      const n = 15 + (demoHash(date) % 40);
      v = Array.from({ length: n }, (_, i) => {
        const h = demoHash(date + i);
        const sym = String.fromCharCode(65 + (h % 26), 65 + ((h >> 5) % 26), 65 + ((h >> 10) % 26));
        return { symbol: sym, name: `${sym} Demo Corp.`, marketCap: Math.round(10 ** (8 + (h % 400) / 100)), eps: ((h % 300) - 50) / 100, time: (["vor Börsenstart", "nach Börsenschluss", null] as const)[h % 3] };
      });
    }
  } else {
    try {
      const res = await fetch(`https://api.nasdaq.com/api/calendar/earnings?date=${date}`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
          Accept: "application/json, text/plain, */*",
          "Accept-Language": "en-US,en;q=0.9",
          Origin: "https://www.nasdaq.com",
          Referer: "https://www.nasdaq.com/",
        },
        signal: AbortSignal.timeout(10_000),
      });
      const j = (await res.json()) as { data?: { rows?: Record<string, unknown>[] | null } };
      v = (j.data?.rows ?? []).map((r) => ({
        symbol: String(r.symbol ?? "").replace(".", "-"),
        name: String(r.name ?? r.symbol ?? ""),
        marketCap: money(r.marketCap),
        eps: money(r.epsForecast),
        time: r.time === "time-pre-market" ? "vor Börsenstart" : r.time === "time-after-hours" ? "nach Börsenschluss" : null,
      }));
    } catch {
      v = [];
    }
  }
  usCache.set(date, { at: Date.now(), v });
  return v;
}

const capCache = new Map<string, { at: number; v: number | null }>();
/** Börsenwerte (für die Sortierung nach Größe) per Yahoo-Sammelabfrage. */
async function marketCaps(symbols: string[]): Promise<Record<string, number | null>> {
  const out: Record<string, number | null> = {};
  const missing = symbols.filter((s) => {
    const c = capCache.get(s);
    if (c && Date.now() - c.at < 24 * 3600_000) return (out[s] = c.v), false;
    return true;
  });
  if (missing.length) {
    if (DEMO) for (const s of missing) out[s] = Math.round(10 ** (9 + (demoHash(s) % 250) / 100));
    else {
      try {
        const res = await yf.quote(missing, { fields: ["marketCap", "currency"] }, { validateResult: false });
        const arr = (Array.isArray(res) ? res : [res]) as { symbol: string; marketCap?: number; currency?: string }[];
        for (const q of arr) {
          // britische Kurse in Pence → Börsenwert grob in Pfund umrechnen
          out[q.symbol] = q.marketCap != null ? (q.currency === "GBp" ? q.marketCap / 100 : q.marketCap) : null;
        }
      } catch {}
    }
    for (const s of missing) capCache.set(s, { at: Date.now(), v: out[s] ?? null });
  }
  return out;
}

/** Quartalszahlen von gestern bis in 7 Tagen: alle US-Unternehmen + Deutschland/Europa + Watchlist. */
export async function getEarnings(watch: string[]): Promise<{ items: Earning[]; demo: boolean; usOk: boolean }> {
  const today = berlinToday();
  const days: string[] = [];
  for (let k = -1; k <= 7; k++) {
    const d = new Date(today + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + k);
    days.push(d.toISOString().slice(0, 10));
  }
  const watchSet = new Set(watch);

  // USA: kompletter Kalender
  const usDays = await mapLimit(days, 3, (d) => usEarnings(d));
  const items: Earning[] = [];
  const seen = new Set<string>();
  usDays.forEach((rows, k) => {
    for (const r of rows) {
      if (!r.symbol || seen.has(r.symbol)) continue;
      seen.add(r.symbol);
      items.push({
        symbol: r.symbol, name: r.name, sector: sectorOf(r.symbol), date: days[k], estimate: false, epsAvg: r.eps,
        inWatchlist: watchSet.has(r.symbol), marketCap: r.marketCap, time: r.time, region: "USA", currency: "USD",
      });
    }
  });
  const usOk = usDays.some((r) => r.length > 0);

  // Deutschland/Europa (+ Watchlist-Werte, die nicht im US-Kalender stehen)
  const others = Array.from(new Set([...watch, ...UNIVERSES.de.symbols, ...UNIVERSES.eu.symbols, ...(usOk ? [] : UNIVERSES.us.symbols)])).filter((s) => !seen.has(s));
  const found = await mapLimit(others, 8, async (s): Promise<Earning | null> => {
    const e = await nextEarnings(s);
    if (!e || e.date < days[0] || e.date > days[days.length - 1]) return null;
    let name = s;
    let currency = "";
    try {
      const h = await getHistory(s, 24 * 3600_000);
      name = h.name;
      currency = h.currency;
    } catch {}
    const region: Earning["region"] = s.includes(".") ? "Europa" : "USA";
    return { symbol: s, name, sector: sectorOf(s), date: e.date, estimate: e.estimate, epsAvg: e.epsAvg, inWatchlist: watchSet.has(s), marketCap: null, time: null, region, currency };
  });
  const eu = found.filter((x): x is Earning => x != null);
  const caps = await marketCaps(eu.map((e) => e.symbol));
  for (const e of eu) e.marketCap = caps[e.symbol] ?? null;
  items.push(...eu);

  items.sort((a, b) => a.date.localeCompare(b.date) || Number(b.inWatchlist) - Number(a.inWatchlist) || (b.marketCap ?? 0) - (a.marketCap ?? 0));
  return { items, demo: DEMO, usOk };
}

// --- News-Feed -----------------------------------------------------------------
export type FeedItem = NewsItem & { tags: string[] };

export async function getNewsFeed(watch: string[]): Promise<{ items: FeedItem[]; demo: boolean }> {
  const sources = [
    ...["^GDAXI", "^GSPC", "^IXIC"].map((s) => ({ s, tag: "Markt" })),
    ...watch.slice(0, 20).map((s) => ({ s, tag: s })),
  ];
  const lists = await mapLimit(sources, 6, async ({ s, tag }) => {
    try {
      return (await getNews(s)).map((n) => ({ ...n, tag }));
    } catch {
      return [];
    }
  });
  const byKey = new Map<string, FeedItem>();
  for (const n of lists.flat()) {
    const key = n.link && n.link !== "#" ? n.link : n.id;
    const cur = byKey.get(key);
    if (cur) {
      if (!cur.tags.includes(n.tag)) cur.tags.push(n.tag);
    } else byKey.set(key, { id: n.id, title: n.title, publisher: n.publisher, link: n.link, time: n.time, thumbnail: n.thumbnail, tags: [n.tag] });
  }
  const items = [...byKey.values()].sort((a, b) => b.time.localeCompare(a.time)).slice(0, 100);
  return { items, demo: DEMO };
}
