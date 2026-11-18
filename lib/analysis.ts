import {
  type Candle,
  adx,
  atr,
  last,
  macd,
  pctChange,
  rsi,
  sma,
  swingLows,
} from "./indicators";

export type Signal = "stark-bullisch" | "bullisch" | "neutral" | "bärisch" | "stark-bärisch";
export type Action = "aufstocken" | "halten" | "abwarten" | "nicht-aufstocken";

export type Reason = { text: string; weight: number };

export type BuyZone = { label: string; from: number; to: number; note: string };

export type Metrics = {
  price: number;
  changePct: number | null;
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
  distSma200Pct: number | null;
  sma200Rising: boolean | null;
  rsi14: number | null;
  macdHist: number | null;
  adx14: number | null;
  atr14: number | null;
  perf1m: number | null;
  perf3m: number | null;
  perf6m: number | null;
  perf12m: number | null;
  high52w: number;
  low52w: number;
  distHigh52wPct: number;
  trendScore: number; // 0–100
};

export type Analysis = {
  signal: Signal;
  score: number; // -100 … +100
  reasons: Reason[];
  action: Action;
  actionText: string;
  buyZones: BuyZone[];
  stopLoss: number | null;
  metrics: Metrics;
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// Handelstage-Abstände
const D1M = 21;
const D3M = 63;
const D6M = 126;
const D12M = 252;

export function computeMetrics(candles: Candle[]): Metrics {
  const closes = candles.map((c) => c.close);
  const price = closes[closes.length - 1];
  const s20 = sma(closes, 20);
  const s50 = sma(closes, 50);
  const s200 = sma(closes, 200);
  const sma200 = last(s200);
  const sma200Prev = last(s200, 20);
  const r = rsi(closes, 14);
  const m = macd(closes);
  const a = adx(candles, 14);
  const t = atr(candles, 14);
  const at = (back: number) => (closes.length > back ? closes[closes.length - 1 - back] : null);
  const yr = candles.slice(-D12M);
  const high52w = Math.max(...yr.map((c) => c.high));
  const low52w = Math.min(...yr.map((c) => c.low));
  const sma50 = last(s50);

  const metrics: Metrics = {
    price,
    changePct: pctChange(at(1), price),
    sma20: last(s20),
    sma50,
    sma200,
    distSma200Pct: pctChange(sma200, price),
    sma200Rising: sma200 != null && sma200Prev != null ? sma200 > sma200Prev : null,
    rsi14: last(r),
    macdHist: last(m.histogram),
    adx14: last(a),
    atr14: last(t),
    perf1m: pctChange(at(D1M), price),
    perf3m: pctChange(at(D3M), price),
    perf6m: pctChange(at(D6M), price),
    perf12m: pctChange(at(D12M), price),
    high52w,
    low52w,
    distHigh52wPct: ((price - high52w) / high52w) * 100,
    trendScore: 0,
  };
  metrics.trendScore = trendScore(metrics);
  return metrics;
}

/**
 * Trendstärke 0–100 für den Screener. Belohnt intakte, steigende Aufwärtstrends
 * nahe am 52-Wochen-Hoch mit hohem ADX und gutem Momentum.
 */
export function trendScore(m: Metrics): number {
  let s = 0;
  if (m.sma50 != null && m.price > m.sma50) s += 15;
  if (m.sma200 != null && m.price > m.sma200) s += 15;
  if (m.sma50 != null && m.sma200 != null && m.sma50 > m.sma200) s += 15;
  if (m.sma200Rising) s += 10;
  if (m.adx14 != null) s += (clamp(m.adx14, 0, 50) / 50) * 20;
  s += clamp(15 + m.distHigh52wPct * 0.75, 0, 15); // 0 % vom Hoch = 15, -20 % = 0
  if (m.perf6m != null) s += (clamp(m.perf6m, 0, 50) / 50) * 10;
  return Math.round(s);
}

export function analyze(candles: Candle[]): Analysis {
  const m = computeMetrics(candles);
  const reasons: Reason[] = [];
  const add = (cond: boolean | null, pos: string, neg: string, w: number) => {
    if (cond == null) return;
    reasons.push(cond ? { text: pos, weight: w } : { text: neg, weight: -w });
  };

  add(m.sma200 != null ? m.price > m.sma200 : null,
    "Kurs über der 200-Tage-Linie (langfristiger Aufwärtstrend)",
    "Kurs unter der 200-Tage-Linie (langfristiger Abwärtstrend)", 20);
  add(m.sma50 != null && m.sma200 != null ? m.sma50 > m.sma200 : null,
    "50-Tage-Linie über 200-Tage-Linie (Golden-Cross-Konstellation)",
    "50-Tage-Linie unter 200-Tage-Linie (Death-Cross-Konstellation)", 15);
  add(m.sma50 != null ? m.price > m.sma50 : null,
    "Kurs über der 50-Tage-Linie (mittelfristig stark)",
    "Kurs unter der 50-Tage-Linie (mittelfristig schwach)", 10);
  add(m.sma200Rising, "200-Tage-Linie steigt", "200-Tage-Linie fällt", 10);
  add(m.macdHist != null ? m.macdHist > 0 : null,
    "MACD über Signallinie (positives Momentum)",
    "MACD unter Signallinie (negatives Momentum)", 10);
  add(m.perf3m != null ? m.perf3m > 0 : null,
    `3-Monats-Performance positiv (${fmtPct(m.perf3m)})`,
    `3-Monats-Performance negativ (${fmtPct(m.perf3m)})`, 10);

  if (m.rsi14 != null) {
    if (m.rsi14 >= 70) reasons.push({ text: `RSI ${m.rsi14.toFixed(0)} – überkauft, Rücksetzer wahrscheinlicher`, weight: -5 });
    else if (m.rsi14 <= 30) reasons.push({ text: `RSI ${m.rsi14.toFixed(0)} – überverkauft, Gegenbewegung möglich`, weight: 5 });
    else if (m.rsi14 >= 50) reasons.push({ text: `RSI ${m.rsi14.toFixed(0)} – im bullischen Bereich`, weight: 10 });
    else reasons.push({ text: `RSI ${m.rsi14.toFixed(0)} – im bärischen Bereich`, weight: -10 });
  }

  let score = reasons.reduce((a, r) => a + r.weight, 0); // max ±85
  if (m.adx14 != null && m.adx14 >= 25) {
    reasons.push({ text: `ADX ${m.adx14.toFixed(0)} – ausgeprägter Trend, Signal verstärkt`, weight: 0 });
    score *= 1.15;
  } else if (m.adx14 != null && m.adx14 < 20) {
    reasons.push({ text: `ADX ${m.adx14.toFixed(0)} – kein klarer Trend (Seitwärtsphase)`, weight: 0 });
    score *= 0.85;
  }
  score = Math.round(clamp(score, -100, 100));

  const signal: Signal =
    score >= 60 ? "stark-bullisch" : score >= 25 ? "bullisch" : score > -25 ? "neutral" : score > -60 ? "bärisch" : "stark-bärisch";

  const { action, actionText, buyZones, stopLoss } = buyAdvice(candles, m, score);
  return { signal, score, reasons, action, actionText, buyZones, stopLoss, metrics: m };
}

function buyAdvice(candles: Candle[], m: Metrics, score: number) {
  const zones: BuyZone[] = [];
  const atrV = m.atr14 ?? m.price * 0.02;
  const uptrend = m.sma200 != null && m.price > m.sma200 && (m.sma50 == null || m.sma50 > m.sma200);

  // Unterstützung: jüngstes Swing-Tief unter dem aktuellen Kurs (letzte ~6 Monate)
  const lows = swingLows(candles.slice(-D6M), 5).filter((l) => l.price < m.price);
  const support = lows.length ? lows[lows.length - 1].price : null;

  if (m.sma50 != null && m.sma50 < m.price) {
    zones.push({ label: "Rücksetzer an 50-Tage-Linie", from: m.sma50 * 0.98, to: m.sma50 * 1.01, note: "Typische Nachkaufzone in intakten Trends" });
  }
  if (support != null && (m.sma50 == null || Math.abs(support - m.sma50) / m.sma50 > 0.02)) {
    zones.push({ label: "Letztes Swing-Tief (Unterstützung)", from: support * 0.99, to: support * 1.01, note: "Hier haben Käufer zuletzt reagiert" });
  }
  if (m.sma200 != null && m.sma200 < m.price) {
    zones.push({ label: "Test der 200-Tage-Linie", from: m.sma200 * 0.97, to: m.sma200 * 1.02, note: "Langfristige Unterstützung – bricht sie, Trendwechsel prüfen" });
  }
  zones.sort((a, b) => b.to - a.to);

  const stopRef = support ?? m.sma50 ?? m.price;
  const stopLoss = Math.min(stopRef - atrV, m.price - 2 * atrV);

  const inZone = zones.some((z) => m.price >= z.from && m.price <= z.to);
  const rsiV = m.rsi14 ?? 50;
  let action: Action;
  let actionText: string;

  if (uptrend && rsiV <= 35) {
    action = "aufstocken";
    actionText = "Überverkauft im langfristigen Aufwärtstrend – klassische Nachkaufgelegenheit. Gestaffelt kaufen, Stop beachten.";
  } else if (uptrend && inZone && score >= 25) {
    action = "aufstocken";
    actionText = "Kurs befindet sich in einer Nachkaufzone eines intakten Aufwärtstrends.";
  } else if (score >= 25 && rsiV >= 70) {
    action = "abwarten";
    actionText = "Trend positiv, aber kurzfristig überkauft. Rücksetzer in eine der Kaufzonen abwarten statt hinterherzulaufen.";
  } else if (score >= 25) {
    action = "halten";
    actionText = "Aufwärtstrend intakt. Bestehende Position halten; Aufstocken bevorzugt bei Rücksetzern in die Kaufzonen.";
  } else if (score > -25) {
    action = "abwarten";
    actionText = m.sma200 != null && m.price < m.sma200
      ? `Kein klares Signal. Erst bei nachhaltiger Rückeroberung der 200-Tage-Linie (${m.sma200.toFixed(2)}) wieder interessant.`
      : "Kein klares Signal – Seitwärtsphase. Ausbruch über das letzte Hoch oder Test einer Unterstützung abwarten.";
  } else {
    action = "nicht-aufstocken";
    actionText = m.sma200 != null
      ? `Abwärtstrend – nicht verbilligen. Erst nach Bodenbildung und Rückkehr über die 200-Tage-Linie (${m.sma200.toFixed(2)}) neu bewerten.`
      : "Abwärtstrend – nicht verbilligen. Bodenbildung abwarten.";
  }

  return { action, actionText, buyZones: zones.slice(0, 3), stopLoss: stopLoss > 0 ? stopLoss : null };
}

function fmtPct(v: number | null) {
  return v == null ? "–" : `${v >= 0 ? "+" : ""}${v.toFixed(1)} %`;
}
