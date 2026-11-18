import type { Analysis } from "@/lib/analysis";
import type { OverlayData, Poly, Rect, HLine, Tag } from "./chartOverlay";

export type Layers = { zones: boolean; buy: boolean; fib: boolean; patterns: boolean; targets: boolean };
export const DEFAULT_LAYERS: Layers = { zones: true, buy: true, fib: true, patterns: true, targets: true };

const C = { up: "#22c55e", down: "#f05252", buy: "#f59e0b", fib: "#a78bfa", tgt: "#38bdf8", flat: "#eab308" };
const a = (hex: string, alpha: number) => hex + Math.round(alpha * 255).toString(16).padStart(2, "0");
const f = (v: number) => v.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function buildOverlay(an: Analysis, n: number, L: Layers, labelBg?: string): OverlayData {
  const pat = an.patterns;
  const last = n - 1;
  const price = an.metrics.price;
  const rects: Rect[] = [];
  const polys: Poly[] = [];
  const hlines: HLine[] = [];
  const tags: Tag[] = [];
  const near = (p: number, d = 0.3) => Math.abs(p / price - 1) <= d;
  const scale: number[] = [];

  if (L.targets) {
    an.patterns.targets.forEach((t, k) => {
      rects.push({
        from: last + 2, to: last + 45, lo: t.lo, hi: t.hi,
        fill: a(C.tgt, t.strong ? 0.3 : 0.16), stroke: t.strong ? C.tgt : a(C.tgt, 0.6), bold: t.strong,
        label: `Ziel ${k + 1}${t.strong ? " ★" : ""} ${f(t.mid)} (${t.distPct >= 0 ? "+" : ""}${t.distPct.toFixed(1).replace(".", ",")} %)`,
        labelColor: C.tgt, labelAlign: "left",
      });
      if (k === 0 && near(t.mid, 0.35)) scale.push(t.hi);
    });
  }

  if (L.zones) {
    let ns = 0;
    let nr = 0;
    for (const z of [...pat.zones].sort((x, y) => Math.abs(x.mid - price) - Math.abs(y.mid - price))) {
      if (z === pat.support || z === pat.resistance || z.touches < 3 || !near(z.mid, 0.15)) continue;
      if (z.mid <= price ? ns++ >= 1 : nr++ >= 1) continue;
      const c = z.mid <= price ? C.up : C.down;
      rects.push({ from: Math.max(z.first, last - 150), to: last + 2, lo: z.lo, hi: z.hi, fill: a(c, 0.07), stroke: a(c, 0.3), label: `${z.mid <= price ? "Unterstützung" : "Widerstand"} ${f(z.mid)} · ${z.touches}×`, labelColor: c });
    }
    if (pat.support) {
      const z = pat.support;
      rects.push({ from: Math.max(z.first, last - 150), to: last + 2, lo: z.lo, hi: z.hi, fill: a(C.up, 0.16), stroke: C.up, bold: true, label: `Nächste Unterstützung ${f(z.mid)} · ${z.touches}×`, labelColor: C.up });
      if (near(z.mid, 0.35)) scale.push(z.lo);
    }
    if (pat.resistance) {
      const z = pat.resistance;
      rects.push({ from: Math.max(z.first, last - 150), to: last + 2, lo: z.lo, hi: z.hi, fill: a(C.down, 0.16), stroke: C.down, bold: true, label: `Nächster Widerstand ${f(z.mid)} · ${z.touches}×`, labelColor: C.down });
      if (near(z.mid, 0.35)) scale.push(z.hi);
    }
  }

  if (L.fib && pat.fib) {
    const fb = pat.fib;
    const from = Math.min(fb.hiIdx, fb.loIdx);
    rects.push({ from, to: last + 2, lo: fb.gp[0], hi: fb.gp[1], fill: a(C.fib, 0.16), label: "Golden Pocket", labelColor: C.fib, labelAlign: "left" });
    for (const l of fb.levels) {
      const key = l.r === 0.5 || l.r === 0.618;
      hlines.push({ from, to: last + 2, p: l.p, color: key ? C.fib : a(C.fib, 0.65), width: key ? 2 : 1, dashed: !key && l.r !== 0 && l.r !== 1, label: `Fib ${(l.r * 100).toFixed(1).replace(".", ",")} %  ${f(l.p)}` });
    }
    for (const e of fb.ext) {
      if (!near(e.p, 0.6)) continue;
      hlines.push({ from, to: last + 2, p: e.p, color: a(C.tgt, 0.8), dashed: true, label: `Fib-Ziel ${(e.r * 100).toFixed(1).replace(".", ",")} %  ${f(e.p)}` });
    }
  }

  if (L.buy) {
    for (const z of an.buyZones) {
      if (!near((z.from + z.to) / 2) || z.label.startsWith("Nächste Unterstützung")) continue;
      rects.push({ from: last - 40, to: last + 15, lo: z.from, hi: z.to, fill: a(C.buy, 0.14), stroke: a(C.buy, 0.7), dashed: true, label: `Kaufzone: ${z.label}`, labelColor: C.buy, labelAlign: "left" });
      scale.push(z.from);
    }
  }

  if (L.patterns) {
    for (const h of pat.harmonics) {
      const [X, A, B, Cc, D] = h.pts;
      const col = h.bull ? C.up : C.down;
      polys.push({ pts: [X, A, B], color: col, fill: a(col, 0.16) });
      polys.push({ pts: [B, Cc, D], color: col, fill: a(col, 0.16) });
      polys.push({ pts: [X, A, B, Cc, D], color: col, width: 2 });
      polys.push({ pts: [X, B], color: col, width: 1, dashed: true });
      polys.push({ pts: [B, D], color: col, width: 1, dashed: true });
      (["X", "A", "B", "C", "D"] as const).forEach((t, k) => {
        const q = h.pts[k];
        tags.push({ i: q.i, p: q.p, text: t, color: a(col, 0.85), below: !q.high });
      });
      tags.push({ i: D.i, p: D.p, text: `${h.name} ${h.bull ? "▲" : "▼"}`, color: col, below: h.bull });
      if (!h.bull && D.i >= last - 60) {
        hlines.push({ from: D.i, to: last + 20, p: h.t1, color: C.down, dashed: true, label: `${h.name} Ziel 1 ${f(h.t1)}` });
      }
    }
    if (pat.prz) {
      const z = pat.prz;
      const col = z.bull ? C.up : C.down;
      const [X, A, B, Cc] = z.pts;
      polys.push({ pts: [X, A, B, Cc], color: col, width: 1.5, dashed: true });
      rects.push({ from: z.fromIdx, to: last + 30, lo: z.lo, hi: z.hi, fill: a(col, 0.12), stroke: col, dashed: true, label: `Entstehendes ${z.name} ${z.bull ? "▲" : "▼"} – PRZ ${f(z.lo)}–${f(z.hi)}`, labelColor: col });
    }
    for (const fm of pat.formations) {
      const col = fm.bull === true ? C.up : fm.bull === false ? C.down : C.flat;
      if (fm.area) rects.push({ from: fm.area.from, to: fm.area.to, lo: fm.area.lo, hi: fm.area.hi, fill: a(col, 0.13) });
      if (fm.fill) {
        const [u, l] = fm.fill;
        polys.push({ pts: [u.a, u.b, l.b, l.a], color: col, fill: a(col, 0.13) });
      }
      for (const s of fm.segs) polys.push({ pts: [s.a, s.b], color: col, width: s.dashed ? 1 : 2, dashed: s.dashed });
      const top = fm.segs[0];
      tags.push({ i: top.a.i, p: Math.max(top.a.p, fm.area?.hi ?? top.a.p), text: fm.name, color: col });
      if (fm.bull === false && fm.target != null && fm.idx >= last - 120) {
        hlines.push({ from: Math.max(fm.idx, last - 20), to: last + 25, p: fm.target, color: C.down, dashed: true, label: `Ziel ${fm.name} ${f(fm.target)}` });
      }
    }
  }

  const autoscale: [number, number] | null = scale.length ? [Math.min(...scale, price), Math.max(...scale, price)] : null;
  return { rects, polys, hlines, tags, autoscale, labelBg };
}
