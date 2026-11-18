"use client";
import { use, useState } from "react";
import dynamic from "next/dynamic";
import { useJson } from "@/lib/useJson";
import type { Analysis } from "@/lib/analysis";
import type { History, NewsItem } from "@/lib/data";
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
        {view === "analyse" ? <StockChart candles={data.candles} /> : <TradingViewChart symbol={data.symbol} />}
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

      <section className="card">
        <h2>Kennzahlen</h2>
        <dl className="kpis">
          <Kpi label="SMA 50" value={fmtNum(m.sma50)} />
          <Kpi label="SMA 200" value={fmtNum(m.sma200)} sub={fmtPct(m.distSma200Pct)} />
          <Kpi label="RSI 14" value={fmtNum(m.rsi14, 0)} sub={m.rsi14 == null ? "" : m.rsi14 < 30 ? "überverkauft" : m.rsi14 > 70 ? "überkauft" : "neutral"} />
          <Kpi label="ADX 14" value={fmtNum(m.adx14, 0)} sub={m.adx14 == null ? "" : m.adx14 >= 25 ? "starker Trend" : m.adx14 < 20 ? "kein Trend" : "mäßig"} />
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
