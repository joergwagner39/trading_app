// Technische Indikatoren. Alle Funktionen liefern Arrays gleicher Länge wie die
// Eingabe; Werte, die mangels Historie nicht berechenbar sind, sind `null`.

export type Candle = {
  time: string; // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type Series = (number | null)[];

export function sma(values: number[], period: number): Series {
  const out: Series = new Array(values.length).fill(null);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

export function ema(values: number[], period: number): Series {
  const out: Series = new Array(values.length).fill(null);
  if (values.length < period) return out;
  const k = 2 / (period + 1);
  let prev = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  out[period - 1] = prev;
  for (let i = period; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

/** RSI nach Wilder. */
export function rsi(values: number[], period = 14): Series {
  const out: Series = new Array(values.length).fill(null);
  if (values.length <= period) return out;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const d = values[i] - values[i - 1];
    if (d >= 0) gain += d;
    else loss -= d;
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;
  const toRsi = () => (avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));
  out[period] = toRsi();
  for (let i = period + 1; i < values.length; i++) {
    const d = values[i] - values[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(d, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-d, 0)) / period;
    out[i] = toRsi();
  }
  return out;
}

export function macd(values: number[], fast = 12, slow = 26, signal = 9) {
  const emaFast = ema(values, fast);
  const emaSlow = ema(values, slow);
  const line: Series = values.map((_, i) =>
    emaFast[i] != null && emaSlow[i] != null ? emaFast[i]! - emaSlow[i]! : null,
  );
  const start = line.findIndex((v) => v != null);
  const signalLine: Series = new Array(values.length).fill(null);
  if (start >= 0) {
    const sig = ema(line.slice(start) as number[], signal);
    sig.forEach((v, j) => (signalLine[start + j] = v));
  }
  const histogram: Series = line.map((v, i) =>
    v != null && signalLine[i] != null ? v - signalLine[i]! : null,
  );
  return { line, signal: signalLine, histogram };
}

function wilderSmooth(values: number[], period: number): Series {
  const out: Series = new Array(values.length).fill(null);
  if (values.length < period) return out;
  let prev = values.slice(0, period).reduce((a, b) => a + b, 0);
  out[period - 1] = prev;
  for (let i = period; i < values.length; i++) {
    prev = prev - prev / period + values[i];
    out[i] = prev;
  }
  return out;
}

export function atr(candles: Candle[], period = 14): Series {
  const tr = candles.map((c, i) => {
    if (i === 0) return c.high - c.low;
    const pc = candles[i - 1].close;
    return Math.max(c.high - c.low, Math.abs(c.high - pc), Math.abs(c.low - pc));
  });
  const out: Series = new Array(candles.length).fill(null);
  if (candles.length < period) return out;
  let prev = tr.slice(0, period).reduce((a, b) => a + b, 0) / period;
  out[period - 1] = prev;
  for (let i = period; i < tr.length; i++) {
    prev = (prev * (period - 1) + tr[i]) / period;
    out[i] = prev;
  }
  return out;
}

/** ADX (Trendstärke, richtungsunabhängig) nach Wilder. */
export function adx(candles: Candle[], period = 14): Series {
  const n = candles.length;
  const out: Series = new Array(n).fill(null);
  if (n < period * 2 + 1) return out;
  const tr: number[] = [];
  const plusDM: number[] = [];
  const minusDM: number[] = [];
  for (let i = 1; i < n; i++) {
    const c = candles[i];
    const p = candles[i - 1];
    const up = c.high - p.high;
    const down = p.low - c.low;
    plusDM.push(up > down && up > 0 ? up : 0);
    minusDM.push(down > up && down > 0 ? down : 0);
    tr.push(Math.max(c.high - c.low, Math.abs(c.high - p.close), Math.abs(c.low - p.close)));
  }
  const sTr = wilderSmooth(tr, period);
  const sPlus = wilderSmooth(plusDM, period);
  const sMinus = wilderSmooth(minusDM, period);
  const dx: number[] = [];
  const dxIdx: number[] = [];
  for (let i = 0; i < tr.length; i++) {
    if (sTr[i] == null || sTr[i] === 0) continue;
    const pdi = (100 * sPlus[i]!) / sTr[i]!;
    const mdi = (100 * sMinus[i]!) / sTr[i]!;
    const sum = pdi + mdi;
    dx.push(sum === 0 ? 0 : (100 * Math.abs(pdi - mdi)) / sum);
    dxIdx.push(i + 1); // +1, da tr bei Kerze 1 beginnt
  }
  if (dx.length < period) return out;
  let prev = dx.slice(0, period).reduce((a, b) => a + b, 0) / period;
  out[dxIdx[period - 1]] = prev;
  for (let j = period; j < dx.length; j++) {
    prev = (prev * (period - 1) + dx[j]) / period;
    out[dxIdx[j]] = prev;
  }
  return out;
}

/** Lokale Tiefs (Unterstützungen): Tief niedriger als `w` Kerzen links und rechts. */
export function swingLows(candles: Candle[], w = 5): { index: number; price: number }[] {
  const res: { index: number; price: number }[] = [];
  for (let i = w; i < candles.length - w; i++) {
    const low = candles[i].low;
    let ok = true;
    for (let j = i - w; j <= i + w; j++) {
      if (j !== i && candles[j].low < low) {
        ok = false;
        break;
      }
    }
    if (ok) res.push({ index: i, price: low });
  }
  return res;
}

export function last<T>(arr: (T | null)[], offset = 0): T | null {
  const i = arr.length - 1 - offset;
  return i >= 0 ? arr[i] : null;
}

export function pctChange(from: number | null | undefined, to: number | null | undefined): number | null {
  if (from == null || to == null || from === 0) return null;
  return ((to - from) / from) * 100;
}

/** Wochenschlüssel (Montag der Woche) eines Tagesdatums YYYY-MM-DD. */
export function weekKey(day: string): string {
  const d = new Date(day + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

/**
 * Gleitender Durchschnitt auf Wochenbasis (z. B. 200-Wochen-Linie), auf die
 * Tageskerzen abgebildet. Die laufende Woche nutzt den jeweils letzten Kurs.
 */
export function weeklySma(candles: Candle[], period: number): Series {
  const out: Series = new Array(candles.length).fill(null);
  const weekly: number[] = [];
  let key = "";
  let sum = 0;
  for (let i = 0; i < candles.length; i++) {
    const k = weekKey(candles[i].time);
    if (k !== key) {
      // abgeschlossene Woche fest in die Summe übernehmen
      if (weekly.length) sum += weekly[weekly.length - 1];
      if (weekly.length >= period) sum -= weekly[weekly.length - period];
      weekly.push(candles[i].close);
      key = k;
    } else weekly[weekly.length - 1] = candles[i].close;
    if (weekly.length >= period) out[i] = (sum + weekly[weekly.length - 1]) / period;
  }
  return out;
}
