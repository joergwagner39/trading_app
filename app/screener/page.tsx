"use client";
import { useEffect, useState } from "react";
import { useJson } from "@/lib/useJson";
import type { ScanResult } from "@/lib/scan";
import Link from "next/link";
import { ETF_FOR_SECTOR, SECTOR_ETFS, SECTOR_ORDER, SECTORS, UNIVERSES, type Sector, type UniverseId } from "@/lib/universe";
import ScanTable from "@/components/ScanTable";
import DemoNote from "@/components/DemoNote";
import { useWatchlist } from "@/lib/watchlist";

type Tab = "trend" | "sma200" | "sma200w" | "rsi";
type Source = UniverseId | "watchlist";

const TABS: { id: Tab; label: string; desc: string }[] = [
  { id: "trend", label: "Trendstärkste", desc: "Sortiert nach Trendstärke (0–100): Lage zu SMA 50/200, steigende 200-Tage-Linie, ADX, Nähe zum 52-Wochen-Hoch und 6-Monats-Momentum." },
  { id: "sma200", label: "An der 200-Tage-Linie", desc: "Aktien, die bis zu ±{band} % um ihre 200-Tage-Linie notieren – oft wichtige Unterstützung bzw. Widerstand." },
  { id: "sma200w", label: "An der 200-Wochen-Linie", desc: "Aktien, die bis zu ±{band200w} % um ihre 200-Wochen-Linie notieren – sehr langfristige Unterstützung, oft gute Einstiegszone bei Qualitätsaktien. Benötigt knapp 4 Jahre Kurshistorie." },
  { id: "rsi", label: "RSI unter 30", desc: "Überverkaufte Aktien (RSI 14 unter {rsi}). Besonders interessant, wenn der langfristige Trend (über SMA 200) intakt ist." },
];

export default function ScreenerPage() {
  const wl = useWatchlist();
  const [tab, setTab] = useState<Tab>("trend");
  const [source, setSource] = useState<Source>("de");
  const [band, setBand] = useState(3);
  const [band200w, setBand200w] = useState(5);
  const [sector, setSector] = useState("");
  const [rsiMax, setRsiMax] = useState(30);
  const [onlyUp, setOnlyUp] = useState(false);
  // ETF, dessen Positionen gerade angezeigt werden (z. B. XLK)
  const [holdingsOf, setHoldingsOf] = useState<string | null>(null);

  // Auswahl merken
  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem("screener.v1") ?? "{}");
      if (s.tab) setTab(s.tab);
      if (s.source) setSource(s.source);
      if (s.sector) setSector(s.sector);
    } catch {}
    // Direktlink /screener?holdings=XLK (z. B. von der ETF-Seite)
    const h = new URLSearchParams(window.location.search).get("holdings");
    if (h) setHoldingsOf(h.toUpperCase());
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("screener.v1", JSON.stringify({ tab, source, sector }));
    } catch {}
  }, [tab, source, sector]);

  const url = holdingsOf
    ? `/api/scan?holdings=${encodeURIComponent(holdingsOf)}`
    : source === "watchlist"
      ? wl.list.length ? `/api/scan?symbols=${encodeURIComponent(wl.list.join(","))}` : null
      : `/api/scan?universe=${source}`;
  const { data, error, loading } = useJson<ScanResult>(url);
  const loaded = data?.rows ?? [];
  // Sektoren, die in der aktuellen Auswahl vorkommen (in fester Reihenfolge)
  const sectors = SECTOR_ORDER.filter((s) => loaded.some((r) => r.sector === s));
  // gewählter Sektor gilt nur, wenn er im aktuellen Markt vorkommt
  const activeSector = !loaded.length || sectors.includes(sector) ? sector : "";
  const all = activeSector ? loaded.filter((r) => r.sector === activeSector) : loaded;
  const sectorEtf = activeSector in ETF_FOR_SECTOR ? ETF_FOR_SECTOR[activeSector as Sector] : null;

  let rows = all;
  if (tab === "trend") rows = all.filter((r) => !onlyUp || (r.metrics.distSma200Pct ?? -1) > 0);
  if (tab === "sma200") rows = all.filter((r) => r.metrics.distSma200Pct != null && Math.abs(r.metrics.distSma200Pct) <= band);
  if (tab === "sma200w") rows = all.filter((r) => r.metrics.distSma200wPct != null && Math.abs(r.metrics.distSma200wPct) <= band200w);
  if (tab === "rsi") rows = all.filter((r) => r.metrics.rsi14 != null && r.metrics.rsi14 < rsiMax && (!onlyUp || (r.metrics.distSma200Pct ?? -1) > 0));

  const t = TABS.find((x) => x.id === tab)!;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Screener</h1>
          <p className="muted">{t.desc.replace("{band}", String(band)).replace("{band200w}", String(band200w)).replace("{rsi}", String(rsiMax))}</p>
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
          <select value={source} onChange={(e) => (setSource(e.target.value as Source), setHoldingsOf(null))}>
            {(Object.keys(UNIVERSES) as UniverseId[]).map((u) => (
              <option key={u} value={u}>{UNIVERSES[u].name}</option>
            ))}
            <option value="watchlist">Meine Watchlist</option>
          </select>
        </label>
        <label>
          Sektor
          <select value={activeSector} onChange={(e) => setSector(e.target.value)}>
            <option value="">Alle Sektoren</option>
            {(sectors.length ? sectors : [...SECTORS]).map((s) => (
              <option key={s} value={s}>
                {s}
                {loaded.length ? ` (${loaded.filter((r) => r.sector === s).length})` : ""}
              </option>
            ))}
          </select>
        </label>
        {tab === "sma200" && (
          <label>
            Abstand max. ±{band} %
            <input type="range" min={1} max={10} value={band} onChange={(e) => setBand(+e.target.value)} />
          </label>
        )}
        {tab === "sma200w" && (
          <label>
            Abstand max. ±{band200w} %
            <input type="range" min={1} max={15} value={band200w} onChange={(e) => setBand200w(+e.target.value)} />
          </label>
        )}
        {tab === "rsi" && (
          <label>
            RSI unter {rsiMax}
            <input type="range" min={15} max={45} step={5} value={rsiMax} onChange={(e) => setRsiMax(+e.target.value)} />
          </label>
        )}
        {tab !== "sma200" && tab !== "sma200w" && (
          <label className="check">
            <input type="checkbox" checked={onlyUp} onChange={(e) => setOnlyUp(e.target.checked)} />
            Nur über 200-Tage-Linie
          </label>
        )}
      </div>

      {sectorEtf && (
        <p className="etf-hint">
          Sektor-ETF für „{activeSector}“:{" "}
          <Link href={`/stock/${sectorEtf}`}>
            <b>{sectorEtf}</b> – {SECTOR_ETFS[sectorEtf]}
          </Link>{" "}
          · zeigt, wie stark der ganze Sektor gerade läuft
        </p>
      )}
      {holdingsOf && (
        <div className="etf-hint holdings-banner">
          <span>
            Aktien in <b>{holdingsOf}</b>
            {data?.etf ? <> – {data.etf.name}</> : null}
            {data?.etf?.source === "liste" ? " (aus der Sektorliste – Yahoo liefert für diesen ETF keine Positionen)" : " (größte Positionen)"}
          </span>
          <button className="btn ghost" onClick={() => setHoldingsOf(null)}>← Zurück zu den ETFs</button>
        </div>
      )}
      {!holdingsOf && (source === "etf" || source === "etfeu") && (
        <p className="muted small">Sektor-Rotation: Die Trendstärke zeigt, welche Sektoren gerade führen und welche schwächeln. Mit „Aktien →“ siehst du die Positionen eines ETFs.</p>
      )}
      {data?.demo && <DemoNote />}
      {error && <p className="error">Fehler: {error}</p>}
      {loading && <p className="muted loading">Analysiere {holdingsOf ? `die Positionen von ${holdingsOf}` : `${source === "watchlist" ? wl.list.length : UNIVERSES[source].symbols.length} Werte`}… (kann beim ersten Mal 10–30 Sek. dauern)</p>}

      {data && !loading && (
        <>
          <p className="muted small">{rows.length} von {all.length} {!holdingsOf && (source === "etf" || source === "etfeu") ? "ETFs" : "Aktien"} · Stand {new Date(data.at).toLocaleString("de-DE")}</p>
          {tab === "trend" && (
            <ScanTable rowAction={!holdingsOf && (source === "etf" || source === "etfeu") ? (r) => (
                <button className="btn small" onClick={() => (setHoldingsOf(r.symbol), window.scrollTo({ top: 0 }))}>Aktien →</button>
              ) : undefined} rows={rows} cols={[...(holdingsOf && loaded.some((r) => r.weight != null) ? (["weight"] as const) : []), "sector", "price", "trend", "signal", "perf3m", "perf6m", "perf12m", "high52"]} initialSort={{ col: "trend", dir: -1 }} />
          )}
          {tab === "sma200" && (
            <ScanTable rowAction={!holdingsOf && (source === "etf" || source === "etfeu") ? (r) => (
                <button className="btn small" onClick={() => (setHoldingsOf(r.symbol), window.scrollTo({ top: 0 }))}>Aktien →</button>
              ) : undefined} rows={rows} cols={[...(holdingsOf && loaded.some((r) => r.weight != null) ? (["weight"] as const) : []), "sector", "price", "dist200", "signal", "rsi", "trend", "perf3m"]} initialSort={{ col: "trend", dir: -1 }}
              empty={`Keine Aktie innerhalb ±${band} % der 200-Tage-Linie.`} />
          )}
          {tab === "sma200w" && (
            <ScanTable rowAction={!holdingsOf && (source === "etf" || source === "etfeu") ? (r) => (
                <button className="btn small" onClick={() => (setHoldingsOf(r.symbol), window.scrollTo({ top: 0 }))}>Aktien →</button>
              ) : undefined} rows={rows} cols={[...(holdingsOf && loaded.some((r) => r.weight != null) ? (["weight"] as const) : []), "sector", "price", "dist200w", "dist200", "signal", "rsi", "perf12m"]} initialSort={{ col: "trend", dir: -1 }}
              empty={`Keine Aktie innerhalb ±${band200w} % der 200-Wochen-Linie.`} />
          )}
          {tab === "rsi" && (
            <ScanTable rowAction={!holdingsOf && (source === "etf" || source === "etfeu") ? (r) => (
                <button className="btn small" onClick={() => (setHoldingsOf(r.symbol), window.scrollTo({ top: 0 }))}>Aktien →</button>
              ) : undefined} rows={rows} cols={[...(holdingsOf && loaded.some((r) => r.weight != null) ? (["weight"] as const) : []), "sector", "price", "rsi", "dist200", "signal", "change", "perf3m"]} initialSort={{ col: "rsi", dir: 1 }}
              empty={`Aktuell keine Aktie mit RSI unter ${rsiMax}.`} />
          )}
        </>
      )}
    </>
  );
}
