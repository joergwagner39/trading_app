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
