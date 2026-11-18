"use client";
import Link from "next/link";
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
  const earn = useJson<{ items: Earning[]; demo: boolean }>(`/api/earnings?symbols=${q}`);

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
          <span className="muted small">gestern bis in 7 Tagen · DAX, Europa, USA + Watchlist</span>
        </div>
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

function EarningsList({ items, today }: { items: Earning[]; today: string }) {
  const days = Array.from(new Set(items.map((i) => i.date)));
  return (
    <div className="earnings">
      {days.map((d) => (
        <div key={d} className={`eday ${d === today ? "today" : ""}`}>
          <h3>{d === today ? "Heute" : d < today ? "Gestern" : shortDate(d)}</h3>
          <ul>
            {items.filter((i) => i.date === d).map((i) => (
              <li key={i.symbol} className={i.inWatchlist ? "wl" : ""}>
                <Link href={href(i.symbol)}>
                  <b>{i.symbol}</b> <span>{i.name}</span>
                </Link>
                <small className="muted">
                  {i.inWatchlist && "★ Watchlist · "}
                  {i.sector !== "Sonstige" ? i.sector : ""}
                  {i.epsAvg != null ? ` · erw. EPS ${fmtNum(i.epsAvg)}` : ""}
                  {i.estimate ? " · Termin geschätzt" : ""}
                </small>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
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
