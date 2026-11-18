"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { ScanRow } from "@/lib/scan";
import { fmtNum, fmtPct, fmtPrice } from "@/lib/format";
import SignalBadge from "./SignalBadge";
import WatchButton from "./WatchButton";
import { useWatchlist } from "@/lib/watchlist";

export type ColId = "sector" | "price" | "change" | "signal" | "trend" | "rsi" | "dist200" | "dist200w" | "adx" | "perf3m" | "perf6m" | "perf12m" | "high52";

type Col = { id: ColId; label: string; get: (r: ScanRow) => number | null; render: (r: ScanRow) => React.ReactNode; hideSm?: boolean };

const tone = (v: number | null | undefined) => (v == null ? "" : v > 0 ? "pos" : v < 0 ? "neg" : "");

const COLS: Record<ColId, Col> = {
  sector: { id: "sector", label: "Sektor", get: () => null, render: (r) => <span className="sector">{r.sector}</span>, hideSm: true },
  price: { id: "price", label: "Kurs", get: (r) => r.metrics.price, render: (r) => fmtPrice(r.metrics.price, r.currency) },
  change: { id: "change", label: "Tag", get: (r) => r.metrics.changePct, render: (r) => <span className={tone(r.metrics.changePct)}>{fmtPct(r.metrics.changePct)}</span> },
  signal: { id: "signal", label: "Signal", get: (r) => r.score, render: (r) => <SignalBadge signal={r.signal} score={r.score} /> },
  trend: {
    id: "trend", label: "Trendstärke", get: (r) => r.metrics.trendScore,
    render: (r) => (
      <span className="meter" title={`${r.metrics.trendScore} / 100`}>
        <span className="bar"><i style={{ width: `${r.metrics.trendScore}%` }} /></span>
        <b>{r.metrics.trendScore}</b>
      </span>
    ),
  },
  rsi: {
    id: "rsi", label: "RSI 14", get: (r) => r.metrics.rsi14,
    render: (r) => <span className={r.metrics.rsi14 != null && r.metrics.rsi14 < 30 ? "pos strong" : r.metrics.rsi14 != null && r.metrics.rsi14 > 70 ? "neg strong" : ""}>{fmtNum(r.metrics.rsi14, 0)}</span>,
  },
  dist200: { id: "dist200", label: "Abst. SMA 200", get: (r) => r.metrics.distSma200Pct, render: (r) => <span className={tone(r.metrics.distSma200Pct)}>{fmtPct(r.metrics.distSma200Pct)}</span> },
  dist200w: { id: "dist200w", label: "Abst. 200-W-Linie", get: (r) => r.metrics.distSma200wPct, render: (r) => <span className={tone(r.metrics.distSma200wPct)}>{fmtPct(r.metrics.distSma200wPct)}</span> },
  adx: { id: "adx", label: "ADX", get: (r) => r.metrics.adx14, render: (r) => fmtNum(r.metrics.adx14, 0), hideSm: true },
  perf3m: { id: "perf3m", label: "3 M", get: (r) => r.metrics.perf3m, render: (r) => <span className={tone(r.metrics.perf3m)}>{fmtPct(r.metrics.perf3m, 0)}</span>, hideSm: true },
  perf6m: { id: "perf6m", label: "6 M", get: (r) => r.metrics.perf6m, render: (r) => <span className={tone(r.metrics.perf6m)}>{fmtPct(r.metrics.perf6m, 0)}</span>, hideSm: true },
  perf12m: { id: "perf12m", label: "12 M", get: (r) => r.metrics.perf12m, render: (r) => <span className={tone(r.metrics.perf12m)}>{fmtPct(r.metrics.perf12m, 0)}</span>, hideSm: true },
  high52: { id: "high52", label: "vom 52W-Hoch", get: (r) => r.metrics.distHigh52wPct, render: (r) => fmtPct(r.metrics.distHigh52wPct), hideSm: true },
};

export default function ScanTable({
  rows,
  cols,
  initialSort,
  empty = "Keine Treffer.",
  removable = false,
}: {
  rows: ScanRow[];
  cols: ColId[];
  initialSort: { col: ColId | "name"; dir: 1 | -1 };
  empty?: string;
  removable?: boolean;
}) {
  const [sort, setSort] = useState(initialSort);
  const sorted = useMemo(() => {
    const s = [...rows];
    if (sort.col === "name") s.sort((a, b) => a.name.localeCompare(b.name) * sort.dir);
    else if (sort.col === "sector") s.sort((a, b) => (a.sector.localeCompare(b.sector) || a.name.localeCompare(b.name)) * sort.dir);
    else {
      const get = COLS[sort.col].get;
      s.sort((a, b) => ((get(a) ?? -Infinity) - (get(b) ?? -Infinity)) * sort.dir);
    }
    return s;
  }, [rows, sort]);

  const head = (id: ColId | "name", label: string, cls = "") => (
    <th className={cls} aria-sort={sort.col === id ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
      <button onClick={() => setSort((s) => ({ col: id, dir: s.col === id ? ((-s.dir) as 1 | -1) : id === "name" ? 1 : -1 }))}>
        {label}
        {sort.col === id && <span aria-hidden>{sort.dir === 1 ? " ↑" : " ↓"}</span>}
      </button>
    </th>
  );

  if (!rows.length) return <p className="muted empty">{empty}</p>;

  return (
    <div className="table-wrap">
      <table className="scan">
        <thead>
          <tr>
            {head("name", "Aktie", "name")}
            {cols.map((c) => head(c, COLS[c].label, COLS[c].hideSm ? "hide-sm" : ""))}
            <th className="act" aria-label="Watchlist" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={r.symbol}>
              <td className="name">
                <Link href={`/stock/${encodeURIComponent(r.symbol)}`}>
                  <b>{r.symbol}</b>
                  <span>{r.name}</span>
                </Link>
              </td>
              {cols.map((c) => (
                <td key={c} className={`num ${COLS[c].hideSm ? "hide-sm" : ""}`}>{COLS[c].render(r)}</td>
              ))}
              <td className="act">{removable ? <RemoveButton symbol={r.symbol} /> : <WatchButton symbol={r.symbol} compact />}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RemoveButton({ symbol }: { symbol: string }) {
  const wl = useWatchlist();
  return (
    <button className="remove" title="Von Watchlist entfernen" aria-label={`${symbol} von Watchlist entfernen`} onClick={() => wl.remove(symbol)}>
      ✕
    </button>
  );
}
