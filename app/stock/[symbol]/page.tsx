"use client";
import { use, useState } from "react";
import dynamic from "next/dynamic";
import { useJson } from "@/lib/useJson";
import type { Analysis } from "@/lib/analysis";
import type { History, Holdings, NewsItem } from "@/lib/data";
import Link from "next/link";
import { fmtNum, fmtPct, fmtPrice, relTime } from "@/lib/format";
import SignalBadge from "@/components/SignalBadge";
import WatchButton from "@/components/WatchButton";
import DemoNote from "@/components/DemoNote";

const TradingViewChart = dynamic(() => import("@/components/TradingViewChart"), { ssr: false, loading: () => <div className="tv-chart skeleton" /> });
const StockChart = dynamic(() => import("@/components/StockChart"), { ssr: false, loading: () => <div className="chart skeleton" /> });

type Detail = History & { analysis: Analysis };

const ACTION_LABEL: Record<Analysis["action"], string> = {
  aufstocken: "Aufstocken",
  halten: "Halten",
  abwarten: "Abwarten",
  "nicht-aufstocken": "Nicht aufstocken",
};

export default function StockPage({ params }: { params: Promise<{ symbol: string }> }) {
  const symbol = decodeURIComponent(use(params).symbol).toUpperCase();
  const { data, error, loading } = useJson<Detail>(`/api/history/${encodeURIComponent(symbol)}`, 60_000);
  const [view, setView] = useState<"analyse" | "tv">("analyse");
  const news = useJson<NewsItem[]>(`/api/news/${encodeURIComponent(symbol)}`);

  if (error) return <p className="error">{error}</p>;
  if (loading || !data) return <p className="muted loading">Lade {symbol}…</p>;

  const a = data.analysis;
  const m = a.metrics;
  const cur = data.currency;

  return (
    <>
      {data.demo && <DemoNote />}
      <div className="page-head stock-head">
        <div>
          <p className="muted small">{data.symbol} · {data.exchange}</p>
          <h1>{data.name}</h1>
          <p className="price">
            {fmtPrice(m.price, cur)}{" "}
            <span className={m.changePct != null && m.changePct >= 0 ? "pos" : "neg"}>{fmtPct(m.changePct, 2)}</span>
          </p>
        </div>
        <WatchButton symbol={data.symbol} />
      </div>

      <section className="card">
        <div className="seg view-switch" role="tablist" aria-label="Chart">
          <button role="tab" aria-selected={view === "analyse"} className={view === "analyse" ? "on" : ""} onClick={() => setView("analyse")}>Analyse-Chart</button>
          <button role="tab" aria-selected={view === "tv"} className={view === "tv" ? "on" : ""} onClick={() => setView("tv")}>TradingView live</button>
        </div>
        {view === "analyse" ? <StockChart candles={data.candles} analysis={a} /> : <TradingViewChart symbol={data.symbol} />}
      </section>

      <div className="grid2">
        <section className="card">
          <div className="card-head">
            <h2>Chartanalyse</h2>
            <SignalBadge signal={a.signal} score={a.score} />
          </div>
          <div className="scorebar" aria-label={`Score ${a.score} von -100 bis +100`}>
            <span className="track" />
            <span className="dot" style={{ left: `${(a.score + 100) / 2}%` }} />
            <small className="l">bärisch</small>
            <small className="r">bullisch</small>
          </div>
          <ul className="reasons">
            {a.reasons.map((r, i) => (
              <li key={i} className={r.weight > 0 ? "pos" : r.weight < 0 ? "neg" : ""}>
                <span aria-hidden>{r.weight > 0 ? "+" : r.weight < 0 ? "−" : "•"}</span>
                {r.text}
              </li>
            ))}
          </ul>
        </section>

        <section className="card">
          <div className="card-head">
            <h2>Wann aufstocken?</h2>
            <span className={`action ${a.action}`}>{ACTION_LABEL[a.action]}</span>
          </div>
          <p>{a.actionText}</p>
          {a.buyZones.length > 0 && (
            <>
              <h3>Kaufzonen</h3>
              <ul className="zones">
                {a.buyZones.map((z) => {
                  const inside = m.price >= z.from && m.price <= z.to;
                  const dist = ((z.to - m.price) / m.price) * 100;
                  return (
                    <li key={z.label} className={inside ? "inside" : ""}>
                      <div>
                        <b>{z.label}</b>
                        <small className="muted">{z.note}</small>
                      </div>
                      <div className="num">
                        {fmtNum(z.from)} – {fmtNum(z.to)}
                        <small className="muted">{inside ? "Kurs in Zone" : fmtPct(dist)}</small>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
          {a.stopLoss != null && (
            <p className="muted small">
              Möglicher Stop-Loss: <b>{fmtPrice(a.stopLoss, cur)}</b> ({fmtPct(((a.stopLoss - m.price) / m.price) * 100)}) – unter letzter Unterstützung bzw. 2× ATR.
            </p>
          )}
        </section>
      </div>

      <PatternCard a={a} candles={data.candles} currency={cur} />
      {data.type === "ETF" && <HoldingsCard symbol={data.symbol} />}

      <section className="card">
        <h2>Kennzahlen</h2>
        <dl className="kpis">
          <Kpi label="SMA 50" value={fmtNum(m.sma50)} />
          <Kpi label="SMA 200" value={fmtNum(m.sma200)} sub={fmtPct(m.distSma200Pct)} />
          <Kpi label="200-Wochen-Linie" value={fmtNum(m.sma200w)} sub={m.sma200w == null ? "zu wenig Historie" : fmtPct(m.distSma200wPct)} />
          <Kpi label="RSI Tag · Woche · Monat" value={`${fmtNum(m.rsi14, 0)} · ${fmtNum(m.rsiW, 0)} · ${fmtNum(m.rsiM, 0)}`} sub={m.rsi14 == null ? "" : m.rsi14 < 30 ? "Tag überverkauft" : m.rsi14 > 70 ? "Tag überkauft" : ""} />
          <Kpi label="Trendstärke" value={`${m.trendScore}/100`} />
          <Kpi label="52W-Hoch" value={fmtNum(m.high52w)} sub={fmtPct(m.distHigh52wPct)} />
          <Kpi label="1 Monat" value={fmtPct(m.perf1m)} />
          <Kpi label="3 Monate" value={fmtPct(m.perf3m)} />
          <Kpi label="6 Monate" value={fmtPct(m.perf6m)} />
          <Kpi label="12 Monate" value={fmtPct(m.perf12m)} />
        </dl>
      </section>

      <section className="card">
        <h2>News</h2>
        {news.loading && <p className="muted">Lade News…</p>}
        {news.error && <p className="muted">News konnten nicht geladen werden.</p>}
        {news.data && news.data.length === 0 && <p className="muted">Keine aktuellen News gefunden.</p>}
        <ul className="news">
          {news.data?.map((n) => (
            <li key={n.id}>
              <a href={n.link} target="_blank" rel="noopener noreferrer">
                {n.thumbnail && <img src={n.thumbnail} alt="" loading="lazy" />}
                <div>
                  <b>{n.title}</b>
                  <small className="muted">{n.publisher} · {relTime(n.time)}</small>
                </div>
              </a>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>
        {value}
        {sub && <small className="muted"> {sub}</small>}
      </dd>
    </div>
  );
}

function PatternCard({ a, candles, currency }: { a: Analysis; candles: Detail["candles"]; currency: string }) {
  const p = a.patterns;
  const price = a.metrics.price;
  const day = (i: number) => (candles[i] ? new Date(candles[i].time).toLocaleDateString("de-DE") : "");
  const dist = (v: number) => fmtPct((v / price - 1) * 100);
  const zone = (z: typeof p.support) =>
    z ? `${fmtNum(z.lo)} – ${fmtNum(z.hi)} · ${z.touches}× getestet · ${dist(z.mid)}` : "–";
  const nearestFib = p.fib
    ? [...p.fib.levels].filter((l) => l.r > 0 && l.r < 1).sort((x, y) => Math.abs(x.p - price) - Math.abs(y.p - price))[0]
    : null;
  return (
    <section className="card">
      <h2>Muster, Zonen &amp; Ziele</h2>
      <div className="grid2 inner">
        <dl className="facts">
          <dt>Nächste Unterstützung</dt>
          <dd className="pos">{zone(p.support)}</dd>
          <dt>Nächster Widerstand</dt>
          <dd className="neg">{zone(p.resistance)}</dd>
          <dt>Fibonacci ({p.fib ? (p.fib.up ? "Aufwärtsswing" : "Abwärtsswing") : "–"})</dt>
          <dd>
            {p.fib ? (
              <>
                Golden Pocket {fmtNum(p.fib.gp[0])} – {fmtNum(p.fib.gp[1])}
                {nearestFib && <> · nächstes Level {(nearestFib.r * 100).toFixed(1).replace(".", ",")} % bei {fmtNum(nearestFib.p)} ({dist(nearestFib.p)})</>}
              </>
            ) : "–"}
          </dd>
          <dt>Zielzonen</dt>
          <dd>
            {p.targets.length === 0 ? "–" : (
              <ol className="targets">
                {p.targets.map((t, k) => (
                  <li key={k} className={t.strong ? "strong" : ""}>
                    <b>Ziel {k + 1}{t.strong ? " ★" : ""}: {fmtPrice(t.mid, currency)}</b> ({fmtPct(t.distPct)})
                    <small className="muted"> {t.sources.join(" + ")}</small>
                  </li>
                ))}
              </ol>
            )}
          </dd>
        </dl>
        <div>
          <h3 style={{ marginTop: 0 }}>Erkannte Muster</h3>
          {p.harmonics.length === 0 && p.formations.length === 0 && !p.prz && <p className="muted">Aktuell kein Muster erkannt.</p>}
          <ul className="patterns">
            {p.prz && (
              <li className={p.prz.bull ? "up" : "down"}>
                <b>Entstehendes {p.prz.name} {p.prz.bull ? "▲" : "▼"}</b>
                <small>Umkehrzone (PRZ) {fmtNum(p.prz.lo)} – {fmtNum(p.prz.hi)} ({dist((p.prz.lo + p.prz.hi) / 2)})</small>
              </li>
            )}
            {[...p.harmonics].reverse().map((h, k) => (
              <li key={`h${k}`} className={h.bull ? "up" : "down"}>
                <b>{h.name} {h.bull ? "bullisch ▲" : "bärisch ▼"}</b>
                <small>Punkt D am {day(h.pts[4].i)} · Ziel 1 {fmtNum(h.t1)} · Ziel 2 {fmtNum(h.t2)} · Stop {fmtNum(h.stop)}</small>
              </li>
            ))}
            {[...p.formations].reverse().map((f, k) => (
              <li key={`f${k}`} className={f.bull === true ? "up" : f.bull === false ? "down" : "flat"}>
                <b>{f.name}</b>
                <small>{f.status} · erkannt am {day(Math.min(f.idx, candles.length - 1))}{f.target != null ? ` · Kursziel ${fmtNum(f.target)}` : ""}</small>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function HoldingsCard({ symbol }: { symbol: string }) {
  const { data, loading } = useJson<Holdings>(`/api/holdings/${encodeURIComponent(symbol)}`);
  if (loading && !data) return null;
  if (!data || data.holdings.length === 0) return null;
  const max = Math.max(...data.holdings.map((h) => h.weight ?? 0), 1);
  return (
    <section className="card">
      <div className="card-head">
        <h2>Größte Positionen</h2>
        <Link className="btn small" href={`/screener?holdings=${encodeURIComponent(symbol)}`}>Im Screener analysieren →</Link>
      </div>
      {data.source === "liste" && <p className="muted small">Yahoo liefert für diesen ETF keine Positionen – angezeigt werden passende Aktien aus der Sektorliste.</p>}
      <ul className="holdings">
        {data.holdings.slice(0, 15).map((h) => (
          <li key={h.symbol}>
            <Link href={`/stock/${encodeURIComponent(h.symbol)}`}>
              <b>{h.symbol}</b>
              <span>{h.name !== h.symbol ? h.name : ""}</span>
            </Link>
            {h.weight != null && (
              <span className="hbar" title={`${fmtNum(h.weight, 1)} %`}>
                <i style={{ width: `${(h.weight / max) * 100}%` }} />
                <small>{fmtNum(h.weight, 1)} %</small>
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

