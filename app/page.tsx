"use client";
import Link from "next/link";
import { useState } from "react";
import { useJson } from "@/lib/useJson";
import { useWatchlist } from "@/lib/watchlist";
import type { Briefing, Earning, Move } from "@/lib/briefing";
import { fmtNum, fmtPct } from "@/lib/format";
import DemoNote from "@/components/DemoNote";

const longDate = (iso: string) =>
  new Date(iso + "T12:00:00Z").toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const shortDate = (iso: string) =>
  new Date(iso + "T12:00:00Z").toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", timeZone: "UTC" });
const tone = (v: number | null | undefined) => (v == null ? "" : v > 0 ? "pos" : v < 0 ? "neg" : "");
const href = (s: string) => `/stock/${encodeURIComponent(s)}`;

export default function BriefingPage() {
  const wl = useWatchlist();
  const q = encodeURIComponent(wl.list.join(","));
  const { data, error, loading } = useJson<Briefing>(`/api/briefing?symbols=${q}`, 5 * 60_000);
  const earn = useJson<{ items: Earning[]; demo: boolean; usOk: boolean }>(`/api/earnings?symbols=${q}`);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Marktbriefing</h1>
          <p className="muted">
            {data?.reportDate ? <>Rückblick auf {longDate(data.reportDate)}</> : "Was an den Märkten passiert ist"} · Quartalszahlen heute und in den nächsten Tagen
          </p>
        </div>
      </div>
      {data?.demo && <DemoNote />}
      {error && <p className="error">Briefing konnte nicht geladen werden: {error}</p>}
      {loading && !data && <p className="muted loading">Erstelle Briefing… (beim ersten Aufruf bis zu 30 Sek.)</p>}

      {data && (
        <>
          <section className="card briefing-text">
            <h2>Kurz zusammengefasst</h2>
            {data.text.map((t, i) => (
              <p key={i}>{t}</p>
            ))}
            <p className="muted small">Stand {new Date(data.at).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr · automatisch aus Kursdaten erstellt</p>
          </section>

          <div className="markets">
            {data.markets.map((m) => (
              <Link key={m.symbol} href={href(m.symbol)} className="tile market">
                <small>{m.name}</small>
                <b>{fmtNum(m.close, m.close < 10 ? 4 : m.close > 1000 ? 0 : 2)}</b>
                <span className={tone(m.changePct)}>{fmtPct(m.changePct, 2)}</span>
                {m.todayPct != null && <em className={tone(m.todayPct)}>heute {fmtPct(m.todayPct, 2)}</em>}
              </Link>
            ))}
          </div>
        </>
      )}

      <section className="card">
        <div className="card-head">
          <h2>Quartalszahlen</h2>
          <span className="muted small">gestern bis in 7 Tagen · alle US-Unternehmen, DAX & Europa, Watchlist</span>
        </div>
        {earn.data && !earn.data.usOk && !earn.data.demo && (
          <p className="muted small">Der US-Kalender (Nasdaq) ist gerade nicht erreichbar – angezeigt werden nur Werte aus den eigenen Listen.</p>
        )}
        {earn.loading && !earn.data && <p className="muted">Lade Termine… (beim ersten Aufruf bis zu 30 Sek.)</p>}
        {earn.error && <p className="muted">Termine konnten nicht geladen werden.</p>}
        {earn.data && earn.data.items.length === 0 && <p className="muted">Keine Quartalszahlen im Zeitraum gefunden.</p>}
        {earn.data && earn.data.items.length > 0 && <EarningsList items={earn.data.items} today={data?.today ?? new Date().toISOString().slice(0, 10)} />}
      </section>

      {data && (
        <>
          <div className="grid2">
            <MoveList title="Größte Gewinner" items={data.gainers} />
            <MoveList title="Größte Verlierer" items={data.losers} />
          </div>
          <div className="grid2" style={{ marginTop: 16 }}>
            <SectorBars title="Sektoren USA" items={data.sectorsUs} />
            <SectorBars title="Sektoren Europa" items={data.sectorsEu} />
          </div>
          {data.watchlist.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <MoveList title="Deine Watchlist" items={data.watchlist} more={<Link href="/watchlist">Zur Watchlist →</Link>} />
            </div>
          )}
        </>
      )}
    </>
  );
}

const CUR: Record<string, string> = { USD: "$", EUR: "€", GBP: "£", GBp: "£", CHF: "CHF", DKK: "DKK" };
function fmtCap(v: number | null, currency: string) {
  if (v == null) return "–";
  const c = CUR[currency] ?? currency;
  if (v >= 1e12) return `${fmtNum(v / 1e12, 1)} Bio. ${c}`;
  if (v >= 1e9) return `${fmtNum(v / 1e9, v >= 1e10 ? 0 : 1)} Mrd. ${c}`;
  return `${fmtNum(v / 1e6, 0)} Mio. ${c}`;
}

type Region = "Alle" | "Europa" | "USA" | "Watchlist";
const TOP = 5;

function EarningsList({ items, today }: { items: Earning[]; today: string }) {
  const [region, setRegion] = useState<Region>("Alle");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const ql = query.trim().toLowerCase();
  const filtered = items.filter(
    (i) =>
      (region === "Alle" || (region === "Watchlist" ? i.inWatchlist : i.region === region)) &&
      (!ql || i.name.toLowerCase().includes(ql) || i.symbol.toLowerCase().includes(ql)),
  );
  // Heute zuerst, dann die kommenden Tage, gestern zuletzt
  const days = Array.from(new Set(items.map((i) => i.date))).sort((a, b) => (a < today ? 1 : 0) - (b < today ? 1 : 0) || a.localeCompare(b));
  const count = (r: Region) => items.filter((i) => r === "Alle" || (r === "Watchlist" ? i.inWatchlist : i.region === r)).length;

  return (
    <>
      <div className="earn-filters">
        <div className="layers">
          {(["Alle", "Europa", "USA", "Watchlist"] as Region[]).map((r) => (
            <button key={r} className={`chip ${region === r ? "on" : ""}`} onClick={() => setRegion(r)}>
              {r === "Europa" ? "Deutschland & Europa" : r} ({count(r)})
            </button>
          ))}
        </div>
        <input type="search" className="earn-search" placeholder="Unternehmen suchen…" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      <div className="edays">
        {days.map((d) => {
          const list = filtered.filter((i) => i.date === d);
          if (!list.length) return null;
          const expanded = open[d] || !!ql;
          // Watchlist-Werte immer zeigen, dann die größten nach Börsenwert
          const top = [...list.filter((i) => i.inWatchlist), ...list.filter((i) => !i.inWatchlist).slice(0, TOP)];
          const shown = expanded ? list : top;
          const rest = list.length - top.length;
          return (
            <div key={d} className={`eday ${d === today ? "today" : ""}`}>
              <h3>
                {d === today ? "Heute · " : d < today ? "Gestern · " : ""}{shortDate(d)} <span className="muted">· {list.length} Unternehmen</span>
              </h3>
              <ul className="erows">
                {shown.map((i) => (
                  <li key={i.symbol} className={i.inWatchlist ? "wl" : ""}>
                    <Link href={href(i.symbol)} className="ename">
                      <b>{i.name}</b>
                      <small>
                        {i.symbol}
                        {i.inWatchlist && " · ★ Watchlist"}
                        {i.sector !== "Sonstige" ? ` · ${i.sector}` : ""}
                      </small>
                    </Link>
                    <span className="etime">{i.time ?? (i.estimate ? "Termin geschätzt" : "")}</span>
                    <span className="ecap" title="Börsenwert">{fmtCap(i.marketCap, i.currency)}</span>
                    <span className="eeps" title="Erwarteter Gewinn je Aktie">{i.epsAvg != null ? `EPS erw. ${fmtNum(i.epsAvg)}` : ""}</span>
                  </li>
                ))}
              </ul>
              {!ql && rest > 0 && (
                <button className="linkbtn more" onClick={() => setOpen((o) => ({ ...o, [d]: !o[d] }))}>
                  {expanded ? "▴ Weniger anzeigen" : `▾ Alle ${list.length} anzeigen (${rest} weitere)`}
                </button>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && <p className="muted">Keine Treffer.</p>}
      </div>
    </>
  );
}

function MoveList({ title, items, more }: { title: string; items: Move[]; more?: React.ReactNode }) {
  return (
    <section className="card" style={{ marginBottom: 0 }}>
      <div className="card-head">
        <h2>{title}</h2>
        {more}
      </div>
      <ul className="moves">
        {items.map((m) => (
          <li key={m.symbol}>
            <Link href={href(m.symbol)}>
              <b>{m.symbol}</b>
              <span>{m.name}</span>
            </Link>
            <span className="muted small">{fmtNum(m.close)}</span>
            <span className={`num ${tone(m.changePct)}`}>{fmtPct(m.changePct, 2)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SectorBars({ title, items }: { title: string; items: Move[] }) {
  const max = Math.max(...items.map((i) => Math.abs(i.changePct ?? 0)), 0.5);
  return (
    <section className="card" style={{ marginBottom: 0 }}>
      <h2>{title}</h2>
      <ul className="sbars">
        {items.map((s) => {
          const v = s.changePct ?? 0;
          return (
            <li key={s.symbol}>
              <Link href={href(s.symbol)} title={s.symbol}>{s.name}</Link>
              <span className="sbar">
                <span className="zero" />
                <i className={v >= 0 ? "up" : "down"} style={{ width: `${(Math.abs(v) / max) * 50}%`, [v >= 0 ? "left" : "right"]: "50%" }} />
              </span>
              <span className={`num ${tone(s.changePct)}`}>{fmtPct(s.changePct, 1)}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
