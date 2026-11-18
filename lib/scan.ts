import "server-only";
import { analyze, type Metrics, type Signal } from "./analysis";
import { getHistory, mapLimit } from "./data";

export type ScanRow = {
  symbol: string;
  name: string;
  currency: string;
  signal: Signal;
  score: number;
  metrics: Metrics;
};

export type ScanResult = { rows: ScanRow[]; failed: string[]; demo: boolean; at: string };

export async function scan(symbols: string[]): Promise<ScanResult> {
  const failed: string[] = [];
  let demo = false;
  const rows = await mapLimit(symbols, 8, async (symbol): Promise<ScanRow | null> => {
    try {
      const h = await getHistory(symbol);
      demo ||= h.demo;
      if (h.candles.length < 60) throw new Error("zu wenig Historie");
      const a = analyze(h.candles);
      return { symbol: h.symbol, name: h.name, currency: h.currency, signal: a.signal, score: a.score, metrics: a.metrics };
    } catch {
      failed.push(symbol);
      return null;
    }
  });
  return { rows: rows.filter((r): r is ScanRow => r != null), failed, demo, at: new Date().toISOString() };
}
