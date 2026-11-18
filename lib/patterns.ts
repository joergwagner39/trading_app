// Mustererkennung: Zickzack, harmonische Muster, Formationen, Unterstützungs-/
// Widerstandszonen, Fibonacci und Zielzonen. Gleiche Logik wie der
// TradingView-Indikator (tradingview/trendradar.pine).

import { type Candle, atr, last } from "./indicators.ts";

export type Pt = { i: number; p: number; high: boolean };
export type Seg = { a: { i: number; p: number }; b: { i: number; p: number }; dashed?: boolean };

export type Harmonic = {
  name: string;
  bull: boolean;
  pts: Pt[]; // X, A, B, C, D
  t1: number;
  t2: number;
  stop: number;
};

export type Prz = { name: string; bull: boolean; lo: number; hi: number; fromIdx: number; pts: Pt[] };

export type Formation = {
  name: string;
  bull: boolean | null;
  segs: Seg[];
  area: { from: number; to: number; lo: number; hi: number } | null;
  fill?: [Seg, Seg]; // Fläche zwischen zwei Linien (Dreiecke/Keile)
  status: string;
  target: number | null;
  idx: number; // Kerze der Erkennung
};

export type Zone = { lo: number; hi: number; mid: number; touches: number; first: number };
export type FibLevel = { r: number; p: number };
export type Fib = { up: boolean; hi: number; lo: number; hiIdx: number; loIdx: number; levels: FibLevel[]; ext: FibLevel[]; gp: [number, number] };
export type Target = { lo: number; hi: number; mid: number; sources: string[]; strong: boolean; distPct: number };

export type Patterns = {
  pivots: Pt[];
  harmonics: Harmonic[];
  prz: Prz | null;
  formations: Formation[];
  zones: Zone[];
  support: Zone | null;
  resistance: Zone | null;
  fib: Fib | null;
  targets: Target[];
};

const ZZ_LEN = 5;
const TOL = 0.05;
const D_TOL = 0.02;
const SR_LEN = 8;
const SR_LOOK = 400;
const SR_WIDTH = 0.5;
const SR_MIN = 2;
const FIB_LEN = 120;
const RECENT = 250;
const MAX_TARGET_DIST = 0.6;

const inR = (v: number, lo: number, hi: number) => v >= lo * (1 - TOL) && v <= hi * (1 + TOL);

/** Wendepunkte wie ta.pivothigh/ta.pivotlow(len, len). */
function pivots(candles: Candle[], len: number) {
  const res: { i: number; p: number; high: boolean }[] = [];
  for (let i = len; i < candles.length - len; i++) {
    let isH = true;
    let isL = true;
    for (let j = i - len; j <= i + len && (isH || isL); j++) {
      if (j === i) continue;
      if (j < i ? candles[j].high > candles[i].high : candles[j].high >= candles[i].high) isH = false;
      if (j < i ? candles[j].low < candles[i].low : candles[j].low <= candles[i].low) isL = false;
    }
    if (isH) res.push({ i, p: candles[i].high, high: true });
    if (isL) res.push({ i, p: candles[i].low, high: false });
  }
  return res;
}

/** Abwechselnde Hochs/Tiefs; bei zwei gleichen Typen in Folge gewinnt der extremere. */
export function zigzag(candles: Candle[], len = ZZ_LEN): Pt[] {
  const zz: Pt[] = [];
  for (const pv of pivots(candles, len)) {
    const prev = zz[zz.length - 1];
    if (prev && prev.high === pv.high) {
      if ((pv.high && pv.p > prev.p) || (!pv.high && pv.p < prev.p)) zz[zz.length - 1] = pv;
    } else zz.push(pv);
  }
  return zz;
}

// Verhältnisse nach Carney: AB/XA, BC/AB, CD/BC, AD/XA
const HARMONICS = [
  { name: "Gartley", ab: [0.618, 0.618], cd: [1.13, 1.618], xd: [0.786, 0.786] },
  { name: "Bat", ab: [0.382, 0.5], cd: [1.618, 2.618], xd: [0.886, 0.886] },
  { name: "Alt-Bat", ab: [0.236, 0.382], cd: [2.0, 3.618], xd: [1.13, 1.13] },
  { name: "Butterfly", ab: [0.786, 0.786], cd: [1.618, 2.24], xd: [1.27, 1.618] },
  { name: "Crab", ab: [0.382, 0.618], cd: [2.24, 3.618], xd: [1.618, 1.618] },
  { name: "Deep Crab", ab: [0.886, 0.886], cd: [2.0, 3.618], xd: [1.618, 1.618] },
] as const;

function harmonicAt(pts: Pt[]): Harmonic | null {
  const [X, A, B, C, D] = pts;
  const xa = Math.abs(A.p - X.p);
  const ab = Math.abs(B.p - A.p);
  const bc = Math.abs(C.p - B.p);
  const cd = Math.abs(D.p - C.p);
  const xc = Math.abs(C.p - X.p);
  if (!xa || !ab || !bc) return null;
  const rAB = ab / xa;
  const rBC = bc / ab;
  const rCD = cd / bc;
  const rXD = Math.abs(A.p - D.p) / xa;
  let name = "";
  for (const h of HARMONICS) {
    if (inR(rAB, h.ab[0], h.ab[1]) && inR(rBC, 0.382, 0.886) && inR(rCD, h.cd[0], h.cd[1]) && inR(rXD, h.xd[0], h.xd[1])) {
      name = h.name;
      break;
    }
  }
  if (!name && xc && inR(rAB, 0.382, 0.618) && inR(rBC, 1.13, 1.414) && inR(cd / xc, 0.786, 0.786)) name = "Cypher";
  if (!name) return null;
  const bull = !D.high;
  const stop = rXD < 1 ? X.p : D.p - Math.sign(A.p - D.p) * 0.13 * xa;
  return { name, bull, pts, t1: D.p + 0.382 * (A.p - D.p), t2: D.p + 0.618 * (A.p - D.p), stop };
}

function przFor(pts: Pt[], candles: Candle[]): Prz | null {
  const [X, A, B, C] = pts;
  const xa = Math.abs(A.p - X.p);
  const ab = Math.abs(B.p - A.p);
  const bc = Math.abs(C.p - B.p);
  if (!xa || !ab || !bc) return null;
  const bull = C.high; // C ist Hoch → D wird Tief
  const dir = bull ? -1 : 1;
  for (const h of HARMONICS) {
    if (!inR(ab / xa, h.ab[0], h.ab[1]) || !inR(bc / ab, 0.382, 0.886)) continue;
    const xd = [A.p + dir * h.xd[0] * (1 - TOL) * xa, A.p + dir * h.xd[1] * (1 + TOL) * xa];
    const cdv = [C.p + dir * h.cd[0] * bc, C.p + dir * h.cd[1] * bc];
    const lo = Math.max(Math.min(...xd), Math.min(...cdv));
    const hi = Math.min(Math.max(...xd), Math.max(...cdv));
    if (lo > hi) continue;
    // ungültig, wenn der Kurs seit C bereits deutlich durch die Zone gelaufen ist
    const after = candles.slice(C.i + 1);
    const broken = bull ? after.some((c) => c.low < lo - 0.13 * xa) : after.some((c) => c.high > hi + 0.13 * xa);
    if (broken) return null;
    return { name: h.name, bull, lo, hi, fromIdx: C.i, pts };
  }
  return null;
}

function lineAt(a: { i: number; p: number }, b: { i: number; p: number }, i: number) {
  return a.p + ((b.p - a.p) * (i - a.i)) / (b.i - a.i);
}

function formations(candles: Candle[], zz: Pt[], atrV: number): Formation[] {
  const out: Formation[] = [];
  const n = candles.length;
  const fromIdx = n - RECENT;
  const closes = candles.map((c) => c.close);

  // Doppelboden / Doppeltop
  for (let k = 2; k < zz.length; k++) {
    const [p1, p2, p3] = [zz[k - 2], zz[k - 1], zz[k]];
    if (p3.i < fromIdx) continue;
    const confirm = p3.i + ZZ_LEN;
    const isDB = !p3.high && Math.abs(p3.p - p1.p) <= D_TOL * p1.p && p2.p - Math.max(p1.p, p3.p) >= 2 * atrV;
    const isDT = p3.high && Math.abs(p3.p - p1.p) <= D_TOL * p1.p && Math.min(p1.p, p3.p) - p2.p >= 2 * atrV;
    if (!isDB && !isDT) continue;
    const neck = p2.p;
    const ext = isDB ? Math.min(p1.p, p3.p) : Math.max(p1.p, p3.p);
    const target = neck + (neck - ext);
    let status = "aktiv – Ausbruch über Nackenlinie abwarten";
    let end = n - 1;
    for (let i = confirm; i < n; i++) {
      if (isDB ? closes[i] > neck : closes[i] < neck) {
        status = isDB ? "Ausbruch bestätigt" : "Nackenlinie gebrochen";
        end = i;
        break;
      }
      if (isDB ? closes[i] < ext : closes[i] > ext) {
        status = "gescheitert";
        end = i;
        break;
      }
    }
    if (!isDB) status = status.replace("Ausbruch über Nackenlinie abwarten", "Bruch der Nackenlinie abwarten");
    out.push({
      name: isDB ? "Doppelboden" : "Doppeltop",
      bull: isDB,
      segs: [{ a: p1, b: p3 }, { a: { i: p1.i, p: neck }, b: { i: Math.min(end + 10, n + 10), p: neck }, dashed: true }],
      area: { from: p1.i, to: p3.i, lo: Math.min(neck, ext), hi: Math.max(neck, ext) },
      status,
      target: status === "gescheitert" ? null : target,
      idx: confirm,
    });
  }

  // Schulter-Kopf-Schulter
  for (let k = 4; k < zz.length; k++) {
    const [s1, n1, hd, n2, s2] = zz.slice(k - 4, k + 1);
    if (s2.i < fromIdx) continue;
    const top = s2.high && hd.p - Math.max(s1.p, s2.p) >= 0.5 * atrV && Math.min(s1.p, s2.p) > Math.max(n1.p, n2.p);
    const inv = !s2.high && Math.min(s1.p, s2.p) - hd.p >= 0.5 * atrV && Math.max(s1.p, s2.p) < Math.min(n1.p, n2.p);
    if (!(top || inv) || Math.abs(s1.p - s2.p) > D_TOL * 1.5 * hd.p) continue;
    const confirm = s2.i + ZZ_LEN;
    const neckMid = (n1.p + n2.p) / 2;
    const target = neckMid + (neckMid - hd.p);
    let status = top ? "aktiv – Bruch der Nackenlinie abwarten" : "aktiv – Ausbruch über Nackenlinie abwarten";
    for (let i = confirm; i < n; i++) {
      const nl = lineAt(n1, n2, i);
      if (top ? closes[i] < nl : closes[i] > nl) {
        status = top ? "Nackenlinie gebrochen" : "Ausbruch bestätigt";
        break;
      }
    }
    out.push({
      name: top ? "Schulter-Kopf-Schulter" : "Inverse Schulter-Kopf-Schulter",
      bull: inv,
      segs: [
        { a: s1, b: n1 }, { a: n1, b: hd }, { a: hd, b: n2 }, { a: n2, b: s2 },
        { a: n1, b: { i: n + 10, p: lineAt(n1, n2, n + 10) }, dashed: true },
      ],
      area: { from: s1.i, to: s2.i, lo: top ? Math.min(n1.p, n2.p) : hd.p, hi: top ? hd.p : Math.max(n1.p, n2.p) },
      status,
      target,
      idx: confirm,
    });
  }

  // Dreiecke, Keile, Kanäle, Rechtecke aus den letzten 4 Wendepunkten
  if (zz.length >= 4) {
    const four = zz.slice(-4);
    const hs = four.filter((p) => p.high);
    const ls = four.filter((p) => !p.high);
    if (hs.length === 2 && ls.length === 2) {
      const [h1, h2] = hs;
      const [l1, l2] = ls;
      const detect = Math.max(h2.i, l2.i) + ZZ_LEN;
      const start = Math.min(h1.i, l1.i);
      const span = detect - start;
      const sH = (h2.p - h1.p) / (h2.i - h1.i);
      const sL = (l2.p - l1.p) / (l2.i - l1.i);
      const up = (i: number) => h1.p + sH * (i - h1.i);
      const lo = (i: number) => l1.p + sL * (i - l1.i);
      const wStart = up(start) - lo(start);
      const wNow = up(detect) - lo(detect);
      const thr = 0.75 * atrV;
      const dh = sH * span;
      const dl = sL * span;
      const flatH = Math.abs(dh) <= thr;
      const flatL = Math.abs(dl) <= thr;
      const conv = dh - dl < -thr;
      const par = Math.abs(dh - dl) <= thr;
      let name = "";
      let bull: boolean | null = null;
      if (flatH && dl > thr) [name, bull] = ["Aufsteigendes Dreieck", true];
      else if (dh < -thr && flatL) [name, bull] = ["Absteigendes Dreieck", false];
      else if (dh < -thr && dl > thr) name = "Symmetrisches Dreieck";
      else if (dh > thr && dl > thr && conv) [name, bull] = ["Steigender Keil", false];
      else if (dh < -thr && dl < -thr && conv) [name, bull] = ["Fallender Keil", true];
      else if (dh > thr && dl > thr && par) [name, bull] = ["Aufwärtskanal", true];
      else if (dh < -thr && dl < -thr && par) [name, bull] = ["Abwärtskanal", false];
      else if (flatH && flatL) name = "Rechteck (Range)";
      const dIdx = Math.min(detect, n - 1);
      const valid =
        name && span >= 15 && wStart >= 2 * atrV && wNow > 0.15 * wStart && detect < n &&
        closes[dIdx] <= up(dIdx) + 0.25 * atrV && closes[dIdx] >= lo(dIdx) - 0.25 * atrV;
      if (valid) {
        let end = n - 1;
        let status = "aktiv";
        let target: number | null = bull === false ? lo(n - 1) - wStart : up(n - 1) + wStart;
        for (let i = detect; i < n; i++) {
          if (up(i) <= lo(i)) {
            status = "Spitze erreicht";
            end = i;
            break;
          }
          if (closes[i] > up(i)) {
            status = "Ausbruch nach oben";
            target = up(i) + wStart;
            end = i;
            break;
          }
          if (closes[i] < lo(i)) {
            status = "Bruch nach unten";
            target = lo(i) - wStart;
            end = i;
            break;
          }
        }
        const uS: Seg = { a: { i: start, p: up(start) }, b: { i: end, p: up(end) } };
        const lS: Seg = { a: { i: start, p: lo(start) }, b: { i: end, p: lo(end) } };
        out.push({
          name,
          bull: status === "Ausbruch nach oben" ? true : status === "Bruch nach unten" ? false : bull,
          segs: [uS, lS],
          area: null,
          fill: [uS, lS],
          status,
          target: status === "Spitze erreicht" ? null : target,
          idx: detect,
        });
      }
    }
  }
  return out.sort((a, b) => a.idx - b.idx);
}

function srZones(candles: Candle[], atrV: number): Zone[] {
  const n = candles.length;
  const pts = pivots(candles, SR_LEN).filter((p) => p.i >= n - SR_LOOK);
  if (!pts.length) return [];
  const sorted = [...pts].sort((a, b) => a.p - b.p);
  const w = atrV * SR_WIDTH;
  const zones: Zone[] = [];
  let cur: { lo: number; hi: number; cnt: number; first: number } | null = null;
  const flush = () => {
    if (!cur) return;
    const lo = cur.lo - w * 0.2;
    const hi = cur.hi + w * 0.2;
    zones.push({ lo, hi, mid: (lo + hi) / 2, touches: cur.cnt, first: cur.first });
  };
  for (const p of sorted) {
    if (cur && p.p - cur.lo <= w) {
      cur.hi = p.p;
      cur.cnt++;
      cur.first = Math.min(cur.first, p.i);
    } else {
      flush();
      cur = { lo: p.p, hi: p.p, cnt: 1, first: p.i };
    }
  }
  flush();
  return zones;
}

function nearest(zones: Zone[], price: number, below: boolean, maxDist: number): Zone | null {
  const side = zones.filter((z) => (below ? z.mid <= price : z.mid > price));
  const byDist = (a: Zone, b: Zone) => Math.abs(a.mid - price) - Math.abs(b.mid - price);
  const strong = side.filter((z) => z.touches >= SR_MIN).sort(byDist)[0] ?? null;
  const any = side.sort(byDist)[0] ?? null;
  if (!strong) return any;
  // starke Zone sehr weit weg, schwächere deutlich näher → die nähere nehmen
  if (any && Math.abs(strong.mid / price - 1) > maxDist && Math.abs(any.mid - price) < Math.abs(strong.mid - price)) return any;
  return strong;
}

function fibonacci(candles: Candle[]): Fib | null {
  const n = candles.length;
  const from = Math.max(0, n - FIB_LEN);
  let hiIdx = from;
  let loIdx = from;
  for (let i = from; i < n; i++) {
    if (candles[i].high >= candles[hiIdx].high) hiIdx = i;
    if (candles[i].low <= candles[loIdx].low) loIdx = i;
  }
  const hi = candles[hiIdx].high;
  const lo = candles[loIdx].low;
  if (!(hi > lo)) return null;
  const up = hiIdx > loIdx;
  const lvl = (r: number) => (up ? hi - r * (hi - lo) : lo + r * (hi - lo));
  const ex = (r: number) => (up ? lo + r * (hi - lo) : hi - r * (hi - lo));
  return {
    up, hi, lo, hiIdx, loIdx,
    levels: [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1].map((r) => ({ r, p: lvl(r) })),
    ext: [1.272, 1.618].map((r) => ({ r, p: ex(r) })),
    gp: [Math.min(lvl(0.618), lvl(0.65)), Math.max(lvl(0.618), lvl(0.65))],
  };
}

export function detectPatterns(candles: Candle[]): Patterns {
  const n = candles.length;
  const price = candles[n - 1].close;
  const atrV = last(atr(candles, 14)) ?? price * 0.02;
  const zz = zigzag(candles);

  const harmonics: Harmonic[] = [];
  for (let k = 4; k < zz.length; k++) {
    if (zz[k].i < n - RECENT) continue;
    const h = harmonicAt(zz.slice(k - 4, k + 1));
    if (h) harmonics.push(h);
  }
  const prz = zz.length >= 4 ? przFor(zz.slice(-4), candles) : null;
  const forms = formations(candles, zz, atrV);

  const zones = srZones(candles, atrV);
  const support = nearest(zones, price, true, 0.3);
  let resistance = nearest(zones, price, false, 0.3);
  const hi52 = Math.max(...candles.slice(-252).map((c) => c.high));
  if (!resistance && hi52 > price * 1.005)
    resistance = { lo: hi52 - atrV * 0.15, hi: hi52 + atrV * 0.15, mid: hi52, touches: 1, first: n - 30 };

  const fib = fibonacci(candles);

  // Zielzonen über dem Kurs: Widerstände + Fib-Extensions + Musterziele, Überlappung = Konfluenz
  const pad = atrV * 0.25;
  const cand: { lo: number; hi: number; src: string }[] = [];
  for (const z of zones) if (z.lo > price) cand.push({ lo: z.lo, hi: z.hi, src: `Widerstand ${z.touches}×` });
  if (resistance && !zones.includes(resistance)) cand.push({ lo: resistance.lo, hi: resistance.hi, src: "52-Wochen-Hoch" });
  if (fib?.up) for (const e of fib.ext) cand.push({ lo: e.p - pad, hi: e.p + pad, src: `Fib ${(e.r * 100).toFixed(1)} %` });
  const lastH = harmonics[harmonics.length - 1];
  if (lastH?.bull && lastH.pts[4].i >= n - 60) {
    cand.push({ lo: lastH.t1 - pad, hi: lastH.t1 + pad, src: `${lastH.name} Ziel 1` });
    cand.push({ lo: lastH.t2 - pad, hi: lastH.t2 + pad, src: `${lastH.name} Ziel 2` });
  }
  for (const f of forms) {
    if (f.bull && f.target != null && f.idx >= n - 120 && !f.status.startsWith("gescheitert"))
      cand.push({ lo: f.target - pad, hi: f.target + pad, src: `${f.name}${f.status === "aktiv" || f.status.startsWith("aktiv") ? " (bei Ausbruch)" : ""}` });
  }
  cand.sort((a, b) => a.lo - b.lo);
  const merged: { lo: number; hi: number; sources: string[] }[] = [];
  for (const c of cand) {
    if (c.lo <= price * 1.002 || c.lo > price * (1 + MAX_TARGET_DIST)) continue;
    const m = merged[merged.length - 1];
    if (m && c.lo <= m.hi) {
      m.hi = Math.max(m.hi, c.hi);
      m.sources.push(c.src);
    } else merged.push({ lo: c.lo, hi: c.hi, sources: [c.src] });
  }
  const targets: Target[] = merged.slice(0, 3).map((m) => {
    const mid = (m.lo + m.hi) / 2;
    return { lo: m.lo, hi: m.hi, mid, sources: m.sources, strong: m.sources.length >= 2, distPct: (mid / price - 1) * 100 };
  });

  return { pivots: zz, harmonics: harmonics.slice(-3), prz, formations: forms.filter((f) => f.status !== "gescheitert" && f.status !== "Spitze erreicht").slice(-3), zones, support, resistance, fib, targets };
}
