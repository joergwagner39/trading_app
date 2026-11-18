"use client";
import Link from "next/link";
import { useWatchlist } from "@/lib/watchlist";
import { useJson } from "@/lib/useJson";
import type { ScanResult } from "@/lib/scan";
import ScanTable from "@/components/ScanTable";
import { fmtPct } from "@/lib/format";
import DemoNote from "@/components/DemoNote";
import SearchBox from "@/components/SearchBox";
import { useEffect, useState } from "react";

export default function WatchlistPage() {
  const wl = useWatchlist();
  const [toast, setToast] = useState("");
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3000);
    return () => clearTimeout(t);
  }, [toast]);
  const url = wl.list.length ? `/api/scan?symbols=${encodeURIComponent(wl.list.join(","))}` : null;
  const { data, error, loading } = useJson<ScanResult>(url, 60_000);
  const rows = (data?.rows ?? []).filter((r) => wl.list.includes(r.symbol));
  const pending = wl.list.filter((s) => !rows.some((r) => r.symbol === s) && !(data?.failed ?? []).includes(s));

  const oversold = rows.filter((r) => r.metrics.rsi14 != null && r.metrics.rsi14 < 30);
  const near200 = rows.filter((r) => r.metrics.distSma200Pct != null && Math.abs(r.metrics.distSma200Pct) <= 3);
  const bull = rows.filter((r) => r.signal.includes("bullisch")).length;
  const bear = rows.filter((r) => r.signal.includes("bärisch")).length;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Watchlist</h1>
          <p className="muted">{wl.list.length} Werte · gespeichert auf diesem Gerät</p>
        </div>
        <ImportExport />
      </div>

      <div className="add-row">
        <SearchBox
          mode="add"
          placeholder="➕ Aktie hinzufügen – Name oder Symbol eingeben (z. B. Rheinmetall, Apple)…"
          onAdded={(h) => setToast(`${h.name || h.symbol} (${h.symbol}) zur Watchlist hinzugefügt`)}
        />
        {toast && <span className="toast" role="status">✓ {toast}</span>}
      </div>
      {pending.length > 0 && <p className="muted small">Lade Daten für: {pending.join(", ")}…</p>}

      {data?.demo && <DemoNote />}

      {rows.length > 0 && (
        <div className="tiles">
          <div className="tile"><small>Bullisch</small><b className="pos">{bull}</b></div>
          <div className="tile"><small>Bärisch</small><b className="neg">{bear}</b></div>
          <div className="tile"><small>RSI unter 30</small><b>{oversold.length}</b></div>
          <div className="tile"><small>An der 200-Tage-Linie</small><b>{near200.length}</b></div>
        </div>
      )}

      {(oversold.length > 0 || near200.length > 0) && (
        <section className="alerts" aria-label="Hinweise">
          {oversold.map((r) => (
            (r.metrics.distSma200Pct ?? -1) > 0 ? (
              <Link key={`o-${r.symbol}`} href={`/stock/${encodeURIComponent(r.symbol)}`} className="alert up">
                <b>{r.symbol}</b> überverkauft im Aufwärtstrend (RSI {r.metrics.rsi14!.toFixed(0)}) – Nachkauf prüfen
              </Link>
            ) : (
              <Link key={`o-${r.symbol}`} href={`/stock/${encodeURIComponent(r.symbol)}`} className="alert warn">
                <b>{r.symbol}</b> überverkauft im Abwärtstrend (RSI {r.metrics.rsi14!.toFixed(0)}) – fallendes Messer, Bodenbildung abwarten
              </Link>
            )
          ))}
          {near200.map((r) => (
            <Link key={`s-${r.symbol}`} href={`/stock/${encodeURIComponent(r.symbol)}`} className="alert">
              <b>{r.symbol}</b> notiert an der 200-Tage-Linie ({fmtPct(r.metrics.distSma200Pct)})
            </Link>
          ))}
        </section>
      )}

      {error && <p className="error">Fehler beim Laden: {error}</p>}
      {loading && !data && <p className="muted loading">Lade Kurse…</p>}
      {wl.list.length === 0 ? (
        <div className="empty-state">
          <p>Deine Watchlist ist leer.</p>
          <p className="muted">Gib oben im Feld „Aktie hinzufügen“ einen Namen ein oder füge Werte im <Link href="/screener">Screener</Link> mit ☆ hinzu.</p>
        </div>
      ) : (
        data && (
          <ScanTable
            rows={rows}
            cols={["price", "change", "signal", "trend", "rsi", "dist200", "perf3m", "perf12m"]}
            initialSort={{ col: "signal", dir: -1 }}
            removable
          />
        )
      )}
      {data && data.failed.filter((s) => wl.list.includes(s)).length > 0 && (
        <p className="muted small">
          Keine Daten für: {data.failed.join(", ")}.{" "}
          {data.failed.map((s) => (
            <button key={s} className="linkbtn" onClick={() => wl.remove(s)}>{s} entfernen</button>
          ))}
        </p>
      )}
    </>
  );
}

function ImportExport() {
  const wl = useWatchlist();
  return (
    <div className="row-actions">
      <button
        className="btn ghost"
        onClick={() => {
          const text = wl.list.join(", ");
          navigator.clipboard?.writeText(text).catch(() => {});
          alert(`Watchlist kopiert:\n\n${text}\n\nAuf einem anderen Gerät über „Importieren“ einfügen.`);
        }}
      >
        Exportieren
      </button>
      <button
        className="btn ghost"
        onClick={() => {
          const v = prompt("Symbole einfügen (durch Komma getrennt), z. B. SAP.DE, AAPL, NVDA:", wl.list.join(", "));
          if (v != null) wl.replace(v.split(/[\s,;]+/));
        }}
      >
        Importieren
      </button>
    </div>
  );
}
