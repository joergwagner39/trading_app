"use client";
import { useEffect, useState } from "react";
import { useJson } from "@/lib/useJson";
import type { ScanResult } from "@/lib/scan";
import { UNIVERSES, type UniverseId } from "@/lib/universe";
import ScanTable from "@/components/ScanTable";
import DemoNote from "@/components/DemoNote";
import { useWatchlist } from "@/lib/watchlist";

type Tab = "trend" | "sma200" | "rsi";
type Source = UniverseId | "watchlist";

const TABS: { id: Tab; label: string; desc: string }[] = [
  { id: "trend", label: "Trendstärkste", desc: "Sortiert nach Trendstärke (0–100): Lage zu SMA 50/200, steigende 200-Tage-Linie, ADX, Nähe zum 52-Wochen-Hoch und 6-Monats-Momentum." },
  { id: "sma200", label: "An der 200-Tage-Linie", desc: "Aktien, die bis zu ±{band} % um ihre 200-Tage-Linie notieren – oft wichtige Unterstützung bzw. Widerstand." },
  { id: "rsi", label: "RSI unter 30", desc: "Überverkaufte Aktien (RSI 14 unter {rsi}). Besonders interessant, wenn der langfristige Trend (über SMA 200) intakt ist." },
];

export default function ScreenerPage() {
  const wl = useWatchlist();
  const [tab, setTab] = useState<Tab>("trend");
  const [source, setSource] = useState<Source>("de");
  const [band, setBand] = useState(3);
  const [rsiMax, setRsiMax] = useState(30);
  const [onlyUp, setOnlyUp] = useState(false);

  // Auswahl merken
  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem("screener.v1") ?? "{}");
      if (s.tab) setTab(s.tab);
      if (s.source) setSource(s.source);
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("screener.v1", JSON.stringify({ tab, source }));
    } catch {}
  }, [tab, source]);

  const url =
    source === "watchlist"
      ? wl.list.length ? `/api/scan?symbols=${encodeURIComponent(wl.list.join(","))}` : null
      : `/api/scan?universe=${source}`;
  const { data, error, loading } = useJson<ScanResult>(url);
  const all = data?.rows ?? [];

  let rows = all;
  if (tab === "trend") rows = all.filter((r) => !onlyUp || (r.metrics.distSma200Pct ?? -1) > 0);
  if (tab === "sma200") rows = all.filter((r) => r.metrics.distSma200Pct != null && Math.abs(r.metrics.distSma200Pct) <= band);
  if (tab === "rsi") rows = all.filter((r) => r.metrics.rsi14 != null && r.metrics.rsi14 < rsiMax && (!onlyUp || (r.metrics.distSma200Pct ?? -1) > 0));

  const t = TABS.find((x) => x.id === tab)!;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Screener</h1>
          <p className="muted">{t.desc.replace("{band}", String(band)).replace("{rsi}", String(rsiMax))}</p>
        </div>
      </div>

      <div className="tabs" role="tablist">
        {TABS.map((x) => (
          <button key={x.id} role="tab" aria-selected={tab === x.id} className={tab === x.id ? "on" : ""} onClick={() => setTab(x.id)}>
            {x.label}
          </button>
        ))}
      </div>

      <div className="filters">
        <label>
          Markt
          <select value={source} onChange={(e) => setSource(e.target.value as Source)}>
            {(Object.keys(UNIVERSES) as UniverseId[]).map((u) => (
              <option key={u} value={u}>{UNIVERSES[u].name}</option>
            ))}
            <option value="watchlist">Meine Watchlist</option>
          </select>
        </label>
        {tab === "sma200" && (
          <label>
            Abstand max. ±{band} %
            <input type="range" min={1} max={10} value={band} onChange={(e) => setBand(+e.target.value)} />
          </label>
        )}
        {tab === "rsi" && (
          <label>
            RSI unter {rsiMax}
            <input type="range" min={15} max={45} step={5} value={rsiMax} onChange={(e) => setRsiMax(+e.target.value)} />
          </label>
        )}
        {tab !== "sma200" && (
          <label className="check">
            <input type="checkbox" checked={onlyUp} onChange={(e) => setOnlyUp(e.target.checked)} />
            Nur über 200-Tage-Linie
          </label>
        )}
      </div>

      {data?.demo && <DemoNote />}
      {error && <p className="error">Fehler: {error}</p>}
      {loading && <p className="muted loading">Analysiere {source === "watchlist" ? wl.list.length : UNIVERSES[source].symbols.length} Aktien… (kann beim ersten Mal 10–20 Sek. dauern)</p>}

      {data && !loading && (
        <>
          <p className="muted small">{rows.length} von {all.length} Aktien · Stand {new Date(data.at).toLocaleString("de-DE")}</p>
          {tab === "trend" && (
            <ScanTable rows={rows} cols={["price", "trend", "signal", "adx", "perf3m", "perf6m", "perf12m", "high52"]} initialSort={{ col: "trend", dir: -1 }} />
          )}
          {tab === "sma200" && (
            <ScanTable rows={rows} cols={["price", "dist200", "signal", "rsi", "trend", "perf3m"]} initialSort={{ col: "trend", dir: -1 }}
              empty={`Keine Aktie innerhalb ±${band} % der 200-Tage-Linie.`} />
          )}
          {tab === "rsi" && (
            <ScanTable rows={rows} cols={["price", "rsi", "dist200", "signal", "change", "perf3m"]} initialSort={{ col: "rsi", dir: 1 }}
              empty={`Aktuell keine Aktie mit RSI unter ${rsiMax}.`} />
          )}
        </>
      )}
    </>
  );
}
