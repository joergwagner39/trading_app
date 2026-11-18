import { test } from "node:test";
import assert from "node:assert/strict";
import { detectPatterns, zigzag } from "./patterns.ts";
import { analyze } from "./analysis.ts";
import type { Candle } from "./indicators.ts";

/** Erzeugt Tageskerzen entlang eines Streckenzugs (je `bars` Kerzen pro Strecke). */
function path(points: number[], bars = 15): Candle[] {
  const out: Candle[] = [];
  let prev = points[0];
  const d = new Date("2024-01-01T00:00:00Z");
  for (let k = 1; k < points.length; k++) {
    for (let j = 1; j <= bars; j++) {
      const close = points[k - 1] + ((points[k] - points[k - 1]) * j) / bars;
      d.setUTCDate(d.getUTCDate() + 1);
      out.push({ time: d.toISOString().slice(0, 10), open: prev, high: Math.max(prev, close) + 0.3, low: Math.min(prev, close) - 0.3, close, volume: 1000 });
      prev = close;
    }
  }
  return out;
}

test("zigzag wechselt Hoch/Tief ab", () => {
  const zz = zigzag(path([100, 120, 90, 130, 80, 110]));
  for (let k = 1; k < zz.length; k++) assert.notEqual(zz[k].high, zz[k - 1].high);
  assert.ok(zz.length >= 4);
});

test("Doppelboden mit Ausbruch und Kursziel", () => {
  const c = path([110, 100, 80, 95, 80.5, 100, 103]);
  const f = detectPatterns(c).formations.find((x) => x.name === "Doppelboden");
  assert.ok(f, "Doppelboden erkannt");
  assert.equal(f!.status, "Ausbruch bestätigt");
  assert.ok(Math.abs(f!.target! - 110) < 2, `Ziel ${f!.target}`);
});

test("bullisches Bat-Muster", () => {
  // X=100, A=150, B=127.5 (0,45 XA), C=141 (0,6 AB), D=105.7 (0,886 XA)
  const c = path([120, 100, 150, 127.5, 141, 105.7, 112]);
  const h = detectPatterns(c).harmonics.find((x) => x.name === "Bat");
  assert.ok(h, "Bat erkannt");
  assert.equal(h!.bull, true);
  assert.ok(h!.t1 > 105.7 && h!.t2 > h!.t1);
});

test("Fibonacci im Aufwärtsswing", () => {
  const c = path([60, 50, 100, 95], 20);
  const fib = detectPatterns(c).fib!;
  assert.equal(fib.up, true);
  const l618 = fib.levels.find((l) => l.r === 0.618)!.p;
  assert.ok(Math.abs(l618 - (fib.hi - 0.618 * (fib.hi - fib.lo))) < 1e-9);
  assert.ok(fib.ext[0].p > fib.hi);
});

test("Unterstützung unter und Widerstand über dem Kurs", () => {
  const c = path([100, 120, 100.5, 120.5, 100.2, 119.8, 110], 12);
  const p = detectPatterns(c);
  assert.ok(p.support && p.support.mid < 110 && p.support.touches >= 2);
  assert.ok(p.resistance && p.resistance.mid > 110 && p.resistance.touches >= 2);
  assert.ok(p.targets.length >= 1 && p.targets[0].mid > 110);
});

test("RSI unter 30 im Abwärtstrend ist kein Kaufsignal", () => {
  const c = path([100, 140, 150, 100], 70);
  const a = analyze(c);
  assert.ok(a.metrics.rsi14! < 30);
  assert.notEqual(a.action, "aufstocken");
  assert.ok(a.signal.includes("bärisch") || a.signal === "neutral");
});
