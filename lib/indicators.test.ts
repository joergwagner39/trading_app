import { test } from "node:test";
import assert from "node:assert/strict";
import { sma, ema, rsi, macd, adx, type Candle } from "./indicators.ts";

const near = (a: number | null, b: number, eps = 1e-6) => assert.ok(a != null && Math.abs(a - b) < eps, `${a} ≈ ${b}`);

test("sma", () => {
  const s = sma([1, 2, 3, 4, 5], 3);
  assert.deepEqual(s.slice(0, 2), [null, null]);
  near(s[2], 2);
  near(s[4], 4);
});

test("ema seeds with sma and converges", () => {
  const e = ema([1, 2, 3, 4, 5, 6], 3);
  near(e[2], 2);
  near(e[3], 3); // 4*0.5 + 2*0.5
  near(e[5], 5);
});

test("rsi: steigende Reihe = 100, fallende = 0, Wilder-Referenz", () => {
  const up = Array.from({ length: 30 }, (_, i) => i + 1);
  near(rsi(up)[29], 100);
  const down = up.map((v) => 100 - v);
  near(rsi(down)[29], 0);
  // Referenzwerte (Wilder, klassisches Beispiel aus StockCharts)
  const closes = [44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.1, 45.42, 45.84, 46.08, 45.89, 46.03, 45.61, 46.28, 46.28, 46.0, 46.03, 46.41, 46.22, 45.64];
  near(rsi(closes)[14], 70.53, 0.15); // Referenz rundet Zwischenwerte
  near(rsi(closes)[15], 66.32, 0.15);
});

test("macd histogram sign follows trend", () => {
  const vals = Array.from({ length: 80 }, (_, i) => 100 + i * 0.5 + (i > 60 ? (i - 60) * 2 : 0));
  const m = macd(vals);
  assert.ok(m.histogram[79]! > 0);
});

test("adx high in clean trend, low in chop", () => {
  const trend: Candle[] = Array.from({ length: 100 }, (_, i) => ({ time: String(i), open: 100 + i, high: 101.5 + i, low: 99.5 + i, close: 101 + i, volume: 1 }));
  assert.ok(adx(trend)[99]! > 40);
  const chop: Candle[] = Array.from({ length: 100 }, (_, i) => {
    const b = 100 + (i % 2 ? 1 : -1);
    return { time: String(i), open: b, high: b + 1.5, low: b - 1.5, close: 100 + (i % 2 ? -1 : 1), volume: 1 };
  });
  assert.ok(adx(chop)[99]! < 20);
});

test("weeklySma entspricht SMA der Wochenschlusskurse", async () => {
  const { weeklySma, weekKey } = await import("./indicators.ts");
  const candles: Candle[] = [];
  const d = new Date("2020-01-01T00:00:00Z");
  for (let i = 0; i < 600; i++) {
    d.setUTCDate(d.getUTCDate() + 1);
    if (d.getUTCDay() === 0 || d.getUTCDay() === 6) continue;
    const c = 100 + Math.sin(i / 7) * 10 + i * 0.05;
    candles.push({ time: d.toISOString().slice(0, 10), open: c, high: c + 1, low: c - 1, close: c, volume: 1 });
  }
  const P = 20;
  const w = weeklySma(candles, P);
  for (const idx of [150, 300, candles.length - 1]) {
    // Referenz: Wochenschlusskurse bis einschließlich Kerze idx
    const closes: number[] = [];
    let key = "";
    for (let i = 0; i <= idx; i++) {
      const k = weekKey(candles[i].time);
      if (k !== key) (closes.push(candles[i].close), (key = k));
      else closes[closes.length - 1] = candles[i].close;
    }
    const ref = closes.slice(-P).reduce((a, b) => a + b, 0) / P;
    near(w[idx], ref, 1e-9);
  }
  assert.equal(w[10], null);
});
