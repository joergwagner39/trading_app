"use client";
import { useState } from "react";
import Link from "next/link";
import { useJson } from "@/lib/useJson";
import { useWatchlist } from "@/lib/watchlist";
import type { FeedItem } from "@/lib/briefing";
import { relTime } from "@/lib/format";
import DemoNote from "@/components/DemoNote";

export default function NewsPage() {
  const wl = useWatchlist();
  const { data, error, loading } = useJson<{ items: FeedItem[]; demo: boolean }>(
    `/api/newsfeed?symbols=${encodeURIComponent(wl.list.join(","))}`,
    5 * 60_000,
  );
  const [filter, setFilter] = useState("Alle");
  const items = data?.items ?? [];
  const tags = ["Alle", "Markt", "Watchlist", ...wl.list.filter((s) => items.some((i) => i.tags.includes(s)))];
  const shown = items.filter((i) =>
    filter === "Alle" ? true : filter === "Watchlist" ? i.tags.some((t) => t !== "Markt") : i.tags.includes(filter),
  );

  return (
    <>
      <div className="page-head">
        <div>
          <h1>News</h1>
          <p className="muted">Markt-News und Meldungen zu deinen Watchlist-Werten · aktualisiert alle 5 Minuten</p>
        </div>
      </div>
      {data?.demo && <DemoNote />}
      <div className="layers" role="group" aria-label="Filter" style={{ marginBottom: 14 }}>
        {tags.map((t) => (
          <button key={t} className={`chip ${filter === t ? "on" : ""}`} onClick={() => setFilter(t)}>
            {t}
            {t !== "Alle" && items.length ? ` (${t === "Watchlist" ? items.filter((i) => i.tags.some((x) => x !== "Markt")).length : items.filter((i) => i.tags.includes(t)).length})` : ""}
          </button>
        ))}
      </div>
      {error && <p className="error">News konnten nicht geladen werden: {error}</p>}
      {loading && !data && <p className="muted loading">Lade News…</p>}
      {data && shown.length === 0 && <p className="muted empty">Keine News gefunden.</p>}
      <section className="card">
        <ul className="news">
          {shown.map((n) => (
            <li key={n.id}>
              <a href={n.link} target="_blank" rel="noopener noreferrer">
                {n.thumbnail && <img src={n.thumbnail} alt="" loading="lazy" />}
                <div>
                  <b>{n.title}</b>
                  <small className="muted">
                    {n.publisher} · {relTime(n.time)}
                  </small>
                </div>
              </a>
              <div className="ntags">
                {n.tags.map((t) =>
                  t === "Markt" ? (
                    <span key={t} className="ntag">Markt</span>
                  ) : (
                    <Link key={t} href={`/stock/${encodeURIComponent(t)}`} className="ntag sym">{t}</Link>
                  ),
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
