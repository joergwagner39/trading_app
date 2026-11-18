"use client";
import { useWatchlist } from "@/lib/watchlist";

export default function WatchButton({ symbol, compact }: { symbol: string; compact?: boolean }) {
  const wl = useWatchlist();
  const on = wl.has(symbol);
  return (
    <button
      className={`star ${on ? "on" : ""} ${compact ? "compact" : ""}`}
      aria-pressed={on}
      aria-label={on ? `${symbol} von Watchlist entfernen` : `${symbol} zur Watchlist hinzufügen`}
      title={on ? "Von Watchlist entfernen" : "Zur Watchlist"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        wl.toggle(symbol);
      }}
    >
      {on ? "★" : "☆"}
      {!compact && <span>{on ? "Auf Watchlist" : "Watchlist"}</span>}
    </button>
  );
}
